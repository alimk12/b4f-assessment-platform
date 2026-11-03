import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AttemptStateService, MSG_SUBMITTED } from '../attempt-state/attempt-state.service';
import { ScoringService } from '../attempt-state/scoring.service';
import { ClockService } from '../common/clock.service';
import { MAX_RUNS_PER_PROBLEM } from '../common/constants';
import { round1 } from '../common/round.util';
import { CodeExecutionService } from '../execution/code-execution.service';
import { ProblemForExecution } from '../execution/execution.types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CodingService {
  private readonly logger = new Logger(CodingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
    private readonly attemptState: AttemptStateService,
    private readonly scoring: ScoringService,
    private readonly execution: CodeExecutionService,
  ) {}

  private async loadAttempt(userId: number, attemptId: number) {
    const attempt = await this.prisma.attempt.findFirst({ where: { id: attemptId, userId }, include: { test: true } });
    if (!attempt) throw new NotFoundException('Attempt not found.');
    if (attempt.test.type !== 'CODING') throw new BadRequestException('This action is only for the coding test.');
    return attempt;
  }

  private async loadProblem(userId: number, attemptId: number, problemId: number) {
    const attempt = await this.loadAttempt(userId, attemptId);
    const problem = await this.prisma.problem.findFirst({
      where: { id: problemId, testId: attempt.testId },
      include: { testCases: { orderBy: { position: 'asc' } } },
    });
    if (!problem) throw new NotFoundException('Problem not found in this test.');
    await this.attemptState.assertAcceptingRequests(attempt);
    return { attempt, problem: problem as unknown as ProblemForExecution & { id: number; points: number } };
  }

  async run(userId: number, attemptId: number, problemId: number, code: string) {
    const { problem } = await this.loadProblem(userId, attemptId, problemId);
    const reserved = await this.prisma.problemResult.updateMany({
      where: { attemptId, problemId, runCount: { lt: MAX_RUNS_PER_PROBLEM } },
      data: { runCount: { increment: 1 } },
    });
    if (reserved.count !== 1) throw new ConflictException(`You have used all ${MAX_RUNS_PER_PROBLEM} runs for this problem.`);
    try {
      const outcome = await this.execution.run(problem, code);
      const row = await this.prisma.problemResult.findUniqueOrThrow({ where: { attemptId_problemId: { attemptId, problemId } } });
      return { ...outcome, runCount: row.runCount, runsRemaining: Math.max(0, MAX_RUNS_PER_PROBLEM - row.runCount) };
    } catch (e) {
      if (e instanceof ServiceUnavailableException) {
        await this.prisma.problemResult.updateMany({ where: { attemptId, problemId }, data: { runCount: { decrement: 1 } } });
      }
      throw e;
    }
  }

  async submit(userId: number, attemptId: number, problemId: number, code: string) {
    const { problem } = await this.loadProblem(userId, attemptId, problemId);
    const row = await this.prisma.problemResult.findUnique({ where: { attemptId_problemId: { attemptId, problemId } } });
    if (row?.submittedAt) throw new ConflictException('This problem has already been submitted.');

    const outcome = await this.execution.submit(problem, code);
    const points = outcome.totalCount ? round1((problem.points * outcome.passedCount) / outcome.totalCount) : 0;
    const submittedAt = this.clock.now();
    const saved = await this.prisma.problemResult.updateMany({
      where: { attemptId, problemId, submittedAt: null },
      data: { code, passedCount: outcome.passedCount, totalCount: outcome.totalCount, points, submittedAt },
    });
    if (saved.count !== 1) throw new ConflictException('This problem has already been submitted.');
    this.logger.log(`Problem submitted: attempt ${attemptId}, problem ${problemId}, ${outcome.passedCount}/${outcome.totalCount}`);
    return {
      problemId,
      mode: outcome.mode,
      passedCount: outcome.passedCount,
      totalCount: outcome.totalCount,
      points,
      submittedAt,
      label: `${outcome.passedCount} of ${outcome.totalCount} tests passed`,
    };
  }

  async finish(userId: number, attemptId: number) {
    const attempt = await this.loadAttempt(userId, attemptId);
    await this.attemptState.assertAcceptingRequests(attempt);
    const submittedAt = this.clock.now();
    const { score, problems } = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.attempt.updateMany({
        where: { id: attemptId, status: 'IN_PROGRESS' },
        data: { status: 'SUBMITTED', submittedAt },
      });
      if (claimed.count !== 1) throw new ConflictException(MSG_SUBMITTED);
      const scored = await this.scoring.scoreCoding(tx, attemptId);
      await tx.attempt.update({ where: { id: attemptId }, data: { score: scored.score } });
      return scored;
    });
    this.logger.log(`Coding finished: attempt ${attemptId}, score ${score}`);
    return { attemptId, status: 'SUBMITTED', score, label: `Coding score: ${score}%`, submittedAt, problems };
  }
}
