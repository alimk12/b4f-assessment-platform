import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, ViolationType } from '@prisma/client';
import { randomBytes } from 'crypto';
import { AlertContext, AlertsService } from '../alerts/alerts.service';
import { AttemptStateService } from '../attempt-state/attempt-state.service';
import { ScoringService } from '../attempt-state/scoring.service';
import { ClockService } from '../common/clock.service';
import {
  CLIPBOARD_VIOLATION_LIMIT,
  DEVICE_SWITCH_ALLOWED,
  FOCUS_VIOLATION_LIMIT,
  VIOLATION_DEDUPE_SECONDS,
} from '../common/constants';
import { PrismaService } from '../prisma/prisma.service';
import { ClientViolationType } from './dto/violation.dto';

type Tx = Prisma.TransactionClient;
type Group = 'FOCUS' | 'CLIPBOARD' | 'DEVICE' | 'SESSION';
const FOCUS: ViolationType[] = ['FULLSCREEN_EXIT', 'TAB_HIDDEN'];
const CLIPBOARD: ViolationType[] = ['COPY', 'CUT', 'PASTE_EXTERNAL', 'DROP_EXTERNAL'];
const DEVICE: ViolationType[] = ['DEVICE_SWITCH'];
export const groupOf = (t: ViolationType): Group =>
  FOCUS.includes(t) ? 'FOCUS' : CLIPBOARD.includes(t) ? 'CLIPBOARD' : DEVICE.includes(t) ? 'DEVICE' : 'SESSION';

const WARNING_FOCUS = 'You left full screen or switched away from the exam. If it happens again, your exam will end.';
const WARNING_CLIPBOARD = (n: number) =>
  n === 1
    ? 'Copy and paste are not allowed during the exam. Warning 1 of 2. A third attempt ends your exam.'
    : 'Copy and paste are not allowed during the exam. Warning 2 of 2. The next attempt ends your exam.';
const WARNING_DEVICE = (n: number) =>
  n === 1
    ? `This exam was opened on another device. Device change 1 of ${DEVICE_SWITCH_ALLOWED}. A third change ends your exam.`
    : `This exam was opened on another device. Device change 2 of ${DEVICE_SWITCH_ALLOWED}. The next change ends your exam.`;
const REASON_FOCUS = `Left full screen or switched away from the exam ${FOCUS_VIOLATION_LIMIT} times.`;
const REASON_CLIPBOARD = `Tried to copy or paste ${CLIPBOARD_VIOLATION_LIMIT} times.`;
const REASON_DEVICE = `Opened the exam on another device ${DEVICE_SWITCH_ALLOWED + 1} times.`;

export const terminatedLabel = (score: number | null) => `Terminated — exam rules violated (${score ?? 0}%)`;

export interface TerminationResult {
  score: number;
  label: string;
  terminationReason: string;
}

/** Result of opening (or re-opening) an attempt: the new key, or the end of the attempt (A-6). */
export interface SessionIssue {
  sessionKey: string | null;
  deviceWarning: string | null;
  terminated: boolean;
  result: TerminationResult | null;
}

@Injectable()
export class IntegrityService {
  private readonly logger = new Logger(IntegrityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
    private readonly attemptState: AttemptStateService,
    private readonly scoring: ScoringService,
    private readonly alerts: AlertsService,
  ) {}

  /**
   * Ends an IN_PROGRESS attempt with the score of what was saved (section 19.3), plus its alert.
   * Returns null when another request finished the attempt first.
   */
  private async terminate(tx: Tx, attemptId: number, reason: string, ctx: AlertContext): Promise<TerminationResult | null> {
    const now = this.clock.now();
    const claimed = await tx.attempt.updateMany({
      where: { id: attemptId, status: 'IN_PROGRESS' },
      data: { status: 'TERMINATED', terminatedAt: now, terminationReason: reason, sessionKey: null },
    });
    if (claimed.count !== 1) return null;
    const { type } = await tx.test.findFirstOrThrow({ where: { attempts: { some: { id: attemptId } } }, select: { type: true } });
    const { score } =
      type === 'MCQ' ? await this.scoring.scoreMcqFromSaved(tx, attemptId) : await this.scoring.scoreCoding(tx, attemptId);
    await tx.attempt.update({ where: { id: attemptId }, data: { score } });
    await this.alerts.createForTermination(tx, ctx, reason);
    return { score, label: terminatedLabel(score), terminationReason: reason };
  }

  /** Stores one violation with the 2-second dedupe. Returns whether it counted and the group total. */
  private async store(tx: Tx, attemptId: number, type: ViolationType, groupTypes: ViolationType[]) {
    const now = this.clock.now();
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
    return { counted, groupCount };
  }

  async recordViolation(userId: number, attemptId: number, type: ClientViolationType) {
    const attempt = await this.prisma.attempt.findFirst({ where: { id: attemptId, userId } });
    if (!attempt) throw new NotFoundException('Attempt not found.');
    await this.attemptState.assertAcceptingRequests(attempt);

    const group = groupOf(type);
    const groupTypes = group === 'FOCUS' ? FOCUS : CLIPBOARD;
    const limit = group === 'FOCUS' ? FOCUS_VIOLATION_LIMIT : CLIPBOARD_VIOLATION_LIMIT;

    const outcome = await this.prisma.$transaction(async (tx) => {
      const { counted, groupCount } = await this.store(tx, attemptId, type, groupTypes);
      let result: TerminationResult | null = null;
      if (counted) {
        // A-7: every counted violation creates one alert, in the same transaction.
        const ctx = await this.alerts.context(tx, attemptId);
        await this.alerts.createForViolation(tx, ctx, type, groupCount);
        if (groupCount >= limit) result = await this.terminate(tx, attemptId, group === 'FOCUS' ? REASON_FOCUS : REASON_CLIPBOARD, ctx);
      }
      return { counted, terminated: result !== null, result };
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

  /**
   * Called by AttemptsService.start inside its transaction.
   * A resume is a device switch (A-6): 1st and 2nd → warning + DANGER alert, 3rd → TERMINATED.
   */
  async issueSessionKey(tx: Tx, attemptId: number, isResume: boolean): Promise<SessionIssue> {
    if (isResume) {
      const { counted, groupCount } = await this.store(tx, attemptId, 'DEVICE_SWITCH', DEVICE);
      if (counted) {
        const ctx = await this.alerts.context(tx, attemptId);
        await this.alerts.createForViolation(tx, ctx, 'DEVICE_SWITCH', groupCount);
        this.logger.log(`Device switch recorded: attempt ${attemptId} (${groupCount})`);
        if (groupCount > DEVICE_SWITCH_ALLOWED) {
          const result = await this.terminate(tx, attemptId, REASON_DEVICE, ctx);
          if (result) {
            this.logger.warn(`Attempt terminated: ${attemptId} (${REASON_DEVICE})`);
            return { sessionKey: null, deviceWarning: null, terminated: true, result };
          }
        }
      }
      const key = randomBytes(32).toString('hex');
      await tx.attempt.update({ where: { id: attemptId }, data: { sessionKey: key } });
      this.logger.log(`Session replaced: attempt ${attemptId}`);
      return {
        sessionKey: key,
        deviceWarning: counted ? WARNING_DEVICE(groupCount) : null,
        terminated: false,
        result: null,
      };
    }
    const key = randomBytes(32).toString('hex');
    await tx.attempt.update({ where: { id: attemptId }, data: { sessionKey: key } });
    return { sessionKey: key, deviceWarning: null, terminated: false, result: null };
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
      deviceSwitches: sum(DEVICE),
      deviceAllowed: DEVICE_SWITCH_ALLOWED,
    };
  }

  /** The permanent summary shown to the instructor (A-8). */
  async getViolationSummary(attemptId: number) {
    const i = await this.getIntegrity(attemptId);
    return {
      device: { count: i.deviceSwitches, allowed: i.deviceAllowed },
      focus: { count: i.focusViolations, limit: i.focusLimit },
      clipboard: { count: i.clipboardViolations, limit: i.clipboardLimit },
    };
  }

  /** Counted device switches per attempt (attempts table, A-8). */
  async deviceSwitchCounts(attemptIds: number[]): Promise<Map<number, number>> {
    if (!attemptIds.length) return new Map();
    const rows = await this.prisma.attemptViolation.groupBy({
      by: ['attemptId'],
      where: { attemptId: { in: attemptIds }, type: 'DEVICE_SWITCH', counted: true },
      _count: { _all: true },
    });
    return new Map(rows.map((r) => [r.attemptId, r._count._all]));
  }

  async listViolations(attemptId: number) {
    const rows = await this.prisma.attemptViolation.findMany({ where: { attemptId }, orderBy: { occurredAt: 'asc' } });
    return rows.map((v) => ({ type: v.type, group: groupOf(v.type), counted: v.counted, occurredAt: v.occurredAt }));
  }
}
