import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Attempt, Test } from '@prisma/client';
import { AttemptStateService } from '../attempt-state/attempt-state.service';
import { PrismaService } from '../prisma/prisma.service';

const FINISHED = ['SUBMITTED', 'EXPIRED', 'TERMINATED'];

@Injectable()
export class StudentTestsService {
  private readonly logger = new Logger(StudentTestsService.name);

  constructor(private readonly prisma: PrismaService, private readonly attemptState: AttemptStateService) {}

  private lockReason(test: Test, all: Test[], attempts: Attempt[]): string | null {
    if (test.order === 1) return null;
    const prev = all.find((t) => t.order === test.order - 1);
    if (!prev) return null;
    const prevAttempt = attempts.find((a) => a.testId === prev.id);
    return prevAttempt && FINISHED.includes(prevAttempt.status) ? null : `Complete the ${prev.title} first.`;
  }

  private async card(test: Test, all: Test[], attempts: Attempt[]) {
    const attempt = attempts.find((a) => a.testId === test.id);
    const itemCount =
      test.type === 'MCQ'
        ? await this.prisma.question.count({ where: { testId: test.id } })
        : await this.prisma.problem.count({ where: { testId: test.id } });
    const lockReason = attempt ? null : this.lockReason(test, all, attempts);
    const state = attempt ? attempt.status : lockReason ? 'LOCKED' : 'AVAILABLE';
    return {
      id: test.id,
      title: test.title,
      type: test.type,
      order: test.order,
      durationMinutes: test.durationMinutes,
      itemCount,
      state,
      lockReason,
      attemptId: attempt?.id ?? null,
      score: attempt && (attempt.status === 'SUBMITTED' || attempt.status === 'TERMINATED') ? attempt.score : null,
    };
  }

  private async context(userId: number) {
    await this.attemptState.expireOverdue();
    const all = await this.prisma.test.findMany({ orderBy: { order: 'asc' } });
    const attempts = await this.prisma.attempt.findMany({ where: { userId } });
    return { all, attempts };
  }

  async listForStudent(userId: number) {
    const { all, attempts } = await this.context(userId);
    return Promise.all(all.filter((t) => t.status === 'PUBLISHED').map((t) => this.card(t, all, attempts)));
  }

  async getForStudent(userId: number, testId: number) {
    const { all, attempts } = await this.context(userId);
    const test = all.find((t) => t.id === testId);
    if (!test) throw new NotFoundException('Test not found.');
    if (test.status !== 'PUBLISHED') {
      this.logger.warn(`Forbidden access to unpublished test ${testId} by user ${userId}`);
      throw new ForbiddenException('This test is not available.');
    }
    return this.card(test, all, attempts);
  }

  async assertCanStart(userId: number, test: Test) {
    const all = await this.prisma.test.findMany({ orderBy: { order: 'asc' } });
    const attempts = await this.prisma.attempt.findMany({ where: { userId } });
    const reason = this.lockReason(test, all, attempts);
    if (reason) {
      this.logger.warn(`Forbidden start of locked test ${test.id} by user ${userId}`);
      throw new ForbiddenException(reason);
    }
  }
}
