import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AttemptStateService } from '../attempt-state/attempt-state.service';
import { ClockService } from '../common/clock.service';
import { CodeExecutionService } from '../execution/code-execution.service';
import { IntegrityService, terminatedLabel } from '../integrity/integrity.service';
import { PrismaService } from '../prisma/prisma.service';
import { buildAttemptOrder } from '../tests/attempt-order.util';
import { toStudentProblem, toStudentQuestions } from './mappers/student-view.mapper';
import { StudentTestsService } from './student-tests.service';

@Injectable()
export class AttemptsService {
  private readonly logger = new Logger(AttemptsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
    private readonly attemptState: AttemptStateService,
    private readonly studentTests: StudentTestsService,
    private readonly integrity: IntegrityService,
    private readonly execution: CodeExecutionService,
  ) {}

  async start(userId: number, testId: number): Promise<{ created: boolean; view: unknown }> {
    const test = await this.prisma.test.findUnique({ where: { id: testId } });
    if (!test) throw new NotFoundException('Test not found.');
    if (test.status !== 'PUBLISHED') {
      this.logger.warn(`Forbidden start of unpublished test ${testId} by user ${userId}`);
      throw new ForbiddenException('This test is not available.');
    }
    await this.attemptState.expireOverdue();

    const existing = await this.prisma.attempt.findUnique({ where: { userId_testId: { userId, testId } } });
    if (existing) return this.resume(existing.id, existing.status);

    await this.studentTests.assertCanStart(userId, test);
    const now = this.clock.now();
    try {
      const { id, key } = await this.prisma.$transaction(async (tx) => {
        const attempt = await tx.attempt.create({
          data: { userId, testId, startedAt: now, deadline: new Date(now.getTime() + test.durationMinutes * 60_000) },
        });
        if (test.type === 'MCQ') {
          const questions = await tx.question.findMany({ where: { testId }, select: { id: true, options: { select: { id: true } } } });
          const { questionOrder, optionOrder } = buildAttemptOrder(questions);
          await tx.attempt.update({ where: { id: attempt.id }, data: { questionOrder, optionOrder } });
        } else {
          const problems = await tx.problem.findMany({ where: { testId }, select: { id: true } });
          await tx.problemResult.createMany({ data: problems.map((p) => ({ attemptId: attempt.id, problemId: p.id })) });
        }
        const { sessionKey: key } = await this.integrity.issueSessionKey(tx, attempt.id, false);
        return { id: attempt.id, key };
      });
      this.logger.log(`Attempt started: ${id} (user ${userId}, test ${testId})`);
      return { created: true, view: await this.view(id, key) };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const again = await this.prisma.attempt.findUniqueOrThrow({ where: { userId_testId: { userId, testId } } });
        return this.resume(again.id, again.status);
      }
      throw e;
    }
  }

  private async resume(attemptId: number, status: string) {
    if (status !== 'IN_PROGRESS') throw new ConflictException('You have already finished this test.');
    const issued = await this.prisma.$transaction((tx) => this.integrity.issueSessionKey(tx, attemptId, true));
    return { created: false, view: await this.view(attemptId, issued.sessionKey) };
  }

  async getForStudent(userId: number, attemptId: number) {
    await this.attemptState.expireOverdue();
    const attempt = await this.prisma.attempt.findFirst({ where: { id: attemptId, userId }, select: { id: true } });
    if (!attempt) throw new NotFoundException('Attempt not found.');
    return this.view(attemptId, null);
  }

  /** The attempt screen data. Uses select so correct options and hidden cases are never loaded. */
  async view(attemptId: number, sessionKey: string | null) {
    const a = await this.prisma.attempt.findUniqueOrThrow({ where: { id: attemptId }, include: { test: true } });
    const base = {
      id: a.id,
      testId: a.testId,
      testTitle: a.test.title,
      type: a.test.type,
      status: a.status,
      startedAt: a.startedAt,
      deadline: a.deadline,
      serverNow: this.clock.now(),
      submittedAt: a.submittedAt,
      terminatedAt: a.terminatedAt,
      sessionKey,
      questions: null as unknown,
      problems: null as unknown,
      executionMode: a.test.type === 'CODING' ? this.execution.getMode() : null,
      integrity: await this.integrity.getIntegrity(a.id),
      result: null as unknown,
    };

    if (a.status !== 'IN_PROGRESS') {
      base.result = await this.result(a.id, a.status, a.score, a.test.type, a.terminationReason);
      return base;
    }
    if (a.test.type === 'MCQ') {
      const questions = await this.prisma.question.findMany({
        where: { testId: a.testId },
        orderBy: { position: 'asc' },
        select: { id: true, text: true, options: { select: { id: true, text: true }, orderBy: { position: 'asc' } } },
      });
      const saved = await this.prisma.mcqAnswer.findMany({ where: { attemptId }, select: { questionId: true, optionId: true } });
      base.questions = toStudentQuestions(
        questions,
        a.questionOrder as number[] | null,
        a.optionOrder as Record<string, number[]> | null,
        new Map(saved.map((s) => [s.questionId, s.optionId])),
      );
    } else {
      const problems = await this.prisma.problem.findMany({
        where: { testId: a.testId },
        orderBy: { position: 'asc' },
        select: {
          id: true,
          title: true,
          description: true,
          functionName: true,
          points: true,
          testCases: { where: { visibility: 'SAMPLE' }, select: { args: true, expected: true }, orderBy: { position: 'asc' }, take: 1 },
        },
      });
      const results = await this.prisma.problemResult.findMany({ where: { attemptId } });
      base.problems = problems.map((p) => toStudentProblem(p, results.find((r) => r.problemId === p.id)));
    }
    return base;
  }

  async result(attemptId: number, status: string, score: number | null, type: string, terminationReason: string | null) {
    if (status === 'EXPIRED') return { score: null, label: 'Expired — not submitted' };
    if (status === 'TERMINATED') return { score, label: terminatedLabel(score), terminationReason };
    if (type === 'MCQ') {
      const attempt = await this.prisma.attempt.findUniqueOrThrow({ where: { id: attemptId }, select: { testId: true } });
      const totalCount = await this.prisma.question.count({ where: { testId: attempt.testId } });
      const correctCount = await this.prisma.mcqAnswer.count({ where: { attemptId, isCorrect: true } });
      return { correctCount, totalCount, score, label: `${correctCount} / ${totalCount} correct (${score}%)` };
    }
    return { score, label: `Coding score: ${score}%` };
  }
}
