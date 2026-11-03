import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, ViolationType } from '@prisma/client';
import { randomBytes } from 'crypto';
import { AttemptStateService } from '../attempt-state/attempt-state.service';
import { ScoringService } from '../attempt-state/scoring.service';
import { ClockService } from '../common/clock.service';
import { CLIPBOARD_VIOLATION_LIMIT, FOCUS_VIOLATION_LIMIT, VIOLATION_DEDUPE_SECONDS } from '../common/constants';
import { PrismaService } from '../prisma/prisma.service';
import { ClientViolationType } from './dto/violation.dto';

type Group = 'FOCUS' | 'CLIPBOARD' | 'SESSION';
const FOCUS: ViolationType[] = ['FULLSCREEN_EXIT', 'TAB_HIDDEN'];
const CLIPBOARD: ViolationType[] = ['COPY', 'CUT', 'PASTE_EXTERNAL', 'DROP_EXTERNAL'];
export const groupOf = (t: ViolationType): Group => (FOCUS.includes(t) ? 'FOCUS' : CLIPBOARD.includes(t) ? 'CLIPBOARD' : 'SESSION');

const WARNING_FOCUS = 'You left full screen or switched away from the exam. If it happens again, your exam will end.';
const WARNING_CLIPBOARD = (n: number) =>
  n === 1
    ? 'Copy and paste are not allowed during the exam. Warning 1 of 2. A third attempt ends your exam.'
    : 'Copy and paste are not allowed during the exam. Warning 2 of 2. The next attempt ends your exam.';
const REASON_FOCUS = `Left full screen or switched away from the exam ${FOCUS_VIOLATION_LIMIT} times.`;
const REASON_CLIPBOARD = `Tried to copy or paste ${CLIPBOARD_VIOLATION_LIMIT} times.`;

export const terminatedLabel = (score: number | null) => `Terminated — exam rules violated (${score ?? 0}%)`;

@Injectable()
export class IntegrityService {
  private readonly logger = new Logger(IntegrityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
    private readonly attemptState: AttemptStateService,
    private readonly scoring: ScoringService,
  ) {}

  async recordViolation(userId: number, attemptId: number, type: ClientViolationType) {
    const attempt = await this.prisma.attempt.findFirst({
      where: { id: attemptId, userId },
      include: { test: { select: { type: true } } },
    });
    if (!attempt) throw new NotFoundException('Attempt not found.');
    await this.attemptState.assertAcceptingRequests(attempt);

    const group = groupOf(type);
    const groupTypes = group === 'FOCUS' ? FOCUS : CLIPBOARD;
    const limit = group === 'FOCUS' ? FOCUS_VIOLATION_LIMIT : CLIPBOARD_VIOLATION_LIMIT;
    const now = this.clock.now();

    const outcome = await this.prisma.$transaction(async (tx) => {
      const recent = await tx.attemptViolation.findFirst({
        where: {
          attemptId,
          counted: true,
          type: { in: groupTypes },
          occurredAt: { gt: new Date(now.getTime() - VIOLATION_DEDUPE_SECONDS * 1000) },
        },
      });
      const counted = !recent;
      await tx.attemptViolation.create({ data: { attemptId, type, counted, occurredAt: now } });
      const groupCount = await tx.attemptViolation.count({ where: { attemptId, counted: true, type: { in: groupTypes } } });

      let terminated = false;
      let result: { score: number; label: string; terminationReason: string } | null = null;
      if (counted && groupCount >= limit) {
        const reason = group === 'FOCUS' ? REASON_FOCUS : REASON_CLIPBOARD;
        const claimed = await tx.attempt.updateMany({
          where: { id: attemptId, status: 'IN_PROGRESS' },
          data: { status: 'TERMINATED', terminatedAt: now, terminationReason: reason },
        });
        if (claimed.count === 1) {
          const { score } =
            attempt.test.type === 'MCQ'
              ? await this.scoring.scoreMcqFromSaved(tx, attemptId)
              : await this.scoring.scoreCoding(tx, attemptId);
          await tx.attempt.update({ where: { id: attemptId }, data: { score } });
          terminated = true;
          result = { score, label: terminatedLabel(score), terminationReason: reason };
        }
      }
      return { counted, terminated, result };
    });

    const integrity = await this.getIntegrity(attemptId);
    this.logger.log(`Violation recorded: attempt ${attemptId}, ${type}, counted=${outcome.counted}`);
    if (outcome.terminated) this.logger.warn(`Attempt terminated: ${attemptId} (${outcome.result?.terminationReason})`);

    let warning: string | null = null;
    if (outcome.counted && !outcome.terminated) {
      warning = group === 'FOCUS' ? WARNING_FOCUS : WARNING_CLIPBOARD(integrity.clipboardViolations);
    }
    return { type, group, counted: outcome.counted, ...integrity, terminated: outcome.terminated, warning, result: outcome.result };
  }

  /** Called by AttemptsService.start inside its transaction. */
  async issueSessionKey(tx: Prisma.TransactionClient, attemptId: number, isResume: boolean): Promise<string> {
    const key = randomBytes(32).toString('hex');
    await tx.attempt.update({ where: { id: attemptId }, data: { sessionKey: key } });
    if (isResume) {
      await tx.attemptViolation.create({ data: { attemptId, type: 'NEW_SESSION', counted: false, occurredAt: this.clock.now() } });
      this.logger.log(`Session replaced: attempt ${attemptId}`);
    }
    return key;
  }

  async getIntegrity(attemptId: number) {
    const rows = await this.prisma.attemptViolation.groupBy({
      by: ['type'],
      where: { attemptId, counted: true },
      _count: { _all: true },
    });
    const sum = (types: ViolationType[]) => rows.filter((r) => types.includes(r.type)).reduce((s, r) => s + r._count._all, 0);
    return {
      focusViolations: sum(FOCUS),
      focusLimit: FOCUS_VIOLATION_LIMIT,
      clipboardViolations: sum(CLIPBOARD),
      clipboardLimit: CLIPBOARD_VIOLATION_LIMIT,
    };
  }

  async listViolations(attemptId: number) {
    const rows = await this.prisma.attemptViolation.findMany({ where: { attemptId }, orderBy: { occurredAt: 'asc' } });
    return rows.map((v) => ({ type: v.type, group: groupOf(v.type), counted: v.counted, occurredAt: v.occurredAt }));
  }
}
