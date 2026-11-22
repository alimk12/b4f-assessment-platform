import { Injectable, NotFoundException } from '@nestjs/common';
import { Attempt, Test, User } from '@prisma/client';
import { AttemptStateService } from '../attempt-state/attempt-state.service';
import { IntegrityService, terminatedLabel } from '../integrity/integrity.service';
import { PrismaService } from '../prisma/prisma.service';
import { AttemptsQueryDto } from './dto/attempts-query.dto';

type Row = Attempt & { user: User; test: Test; _count: { violations: number } };

@Injectable()
export class ResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attemptState: AttemptStateService,
    private readonly integrity: IntegrityService,
  ) {}

  private timeUsedSeconds(a: Row): number | null {
    const secs = (end: Date) => Math.round((end.getTime() - a.startedAt.getTime()) / 1000);
    if (a.status === 'SUBMITTED' && a.submittedAt) return secs(a.submittedAt);
    if (a.status === 'TERMINATED' && a.terminatedAt) return secs(a.terminatedAt);
    if (a.status === 'EXPIRED') return a.test.durationMinutes * 60;
    return null;
  }

  private toRow(a: Row) {
    return {
      id: a.id,
      student: { id: a.user.id, fullName: a.user.fullName, email: a.user.email },
      test: { id: a.test.id, title: a.test.title, type: a.test.type },
      status: a.status,
      startedAt: a.startedAt,
      deadline: a.deadline,
      submittedAt: a.submittedAt,
      terminatedAt: a.terminatedAt,
      timeUsedSeconds: this.timeUsedSeconds(a),
      score: a.status === 'EXPIRED' ? null : a.score,
      violationCount: a._count.violations,
      terminationReason: a.terminationReason,
    };
  }

  private include = { user: true, test: true, _count: { select: { violations: { where: { counted: true } } } } } as const;

  async listAttempts(q: AttemptsQueryDto) {
    await this.attemptState.expireOverdue();
    const rows = await this.prisma.attempt.findMany({
      where: {
        ...(q.testId ? { testId: q.testId } : {}),
        ...(q.status ? { status: q.status } : {}),
        ...(q.search ? { user: { fullName: { contains: q.search, mode: 'insensitive' as const } } } : {}),
      },
      include: this.include,
      orderBy: { startedAt: 'desc' },
    });
    return rows.map((r) => this.toRow(r as Row));
  }

  async getAttemptDetail(attemptId: number) {
    await this.attemptState.expireOverdue();
    const a = await this.prisma.attempt.findUnique({ where: { id: attemptId }, include: this.include });
    if (!a) throw new NotFoundException('Attempt not found.');
    const row = this.toRow(a as Row);
    const violations = await this.integrity.listViolations(attemptId);
    if (a.test.type === 'MCQ') {
      const totalCount = await this.prisma.question.count({ where: { testId: a.testId } });
      const correctCount = await this.prisma.mcqAnswer.count({ where: { attemptId, isCorrect: true } });
      return { ...row, mcq: { correctCount, totalCount }, violations };
    }
    const results = await this.prisma.problemResult.findMany({
      where: { attemptId },
      include: { problem: { select: { title: true, position: true } } },
      orderBy: { problem: { position: 'asc' } },
    });
    return {
      ...row,
      problems: results.map((r) => ({
        problemId: r.problemId,
        title: r.problem.title,
        runCount: r.runCount,
        submitted: r.submittedAt !== null,
        passedCount: r.passedCount,
        totalCount: r.totalCount,
        points: r.points,
      })),
      violations,
    };
  }

  async listStudentResults(userId: number) {
    await this.attemptState.expireOverdue();
    const rows = await this.prisma.attempt.findMany({
      where: { userId, status: { in: ['SUBMITTED', 'EXPIRED', 'TERMINATED'] } },
      include: { test: true },
      orderBy: { test: { order: 'asc' } },
    });
    return rows.map((a) => ({
      testId: a.testId,
      testTitle: a.test.title,
      type: a.test.type,
      status: a.status,
      score: a.status === 'EXPIRED' ? null : a.score,
      label:
        a.status === 'EXPIRED' ? 'Expired — not submitted' : a.status === 'TERMINATED' ? terminatedLabel(a.score) : `${a.score}%`,
      startedAt: a.startedAt,
      submittedAt: a.submittedAt,
      terminatedAt: a.terminatedAt,
      terminationReason: a.terminationReason,
    }));
  }
}
