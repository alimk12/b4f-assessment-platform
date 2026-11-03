import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { round1 } from '../common/round.util';

type Tx = Prisma.TransactionClient;

@Injectable()
export class ScoringService {
  /** correct saved answers / all questions x 100 (unanswered = wrong). */
  async scoreMcqFromSaved(tx: Tx, attemptId: number) {
    const attempt = await tx.attempt.findUniqueOrThrow({ where: { id: attemptId }, select: { testId: true } });
    const totalCount = await tx.question.count({ where: { testId: attempt.testId } });
    const correctCount = await tx.mcqAnswer.count({ where: { attemptId, isCorrect: true } });
    return { correctCount, totalCount, score: totalCount ? round1((correctCount / totalCount) * 100) : 0 };
  }

  /** Unsubmitted problems get 0 points; sum of points / sum of problem points x 100. */
  async scoreCoding(tx: Tx, attemptId: number) {
    await tx.problemResult.updateMany({ where: { attemptId, submittedAt: null }, data: { points: 0 } });
    const results = await tx.problemResult.findMany({
      where: { attemptId },
      include: { problem: { select: { id: true, title: true, points: true, position: true } } },
      orderBy: { problem: { position: 'asc' } },
    });
    const earned = results.reduce((s, r) => s + (r.points ?? 0), 0);
    const possible = results.reduce((s, r) => s + r.problem.points, 0);
    return {
      score: possible ? round1((earned / possible) * 100) : 0,
      problems: results.map((r) => ({
        problemId: r.problem.id,
        title: r.problem.title,
        submitted: r.submittedAt !== null,
        points: r.points ?? 0,
      })),
    };
  }
}
