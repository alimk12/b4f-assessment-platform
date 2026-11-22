import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, TestType } from '@prisma/client';

type Tx = Prisma.TransactionClient;

/** The three tests every cohort has (A-1). */
export const DEFAULT_TESTS: { order: number; title: string; type: TestType; durationMinutes: number }[] = [
  { order: 1, title: 'IQ Test', type: 'MCQ', durationMinutes: 20 },
  { order: 2, title: 'HTML & CSS Test', type: 'MCQ', durationMinutes: 20 },
  { order: 3, title: 'JavaScript Problem Solving', type: 'CODING', durationMinutes: 45 },
];

/**
 * Copies content between tests (A-2, A-12). The source is only read, never changed.
 * Copied rows get new ids and are appended after the target's existing content.
 * All methods run inside the caller's transaction.
 */
@Injectable()
export class CopyService {
  private readonly logger = new Logger(CopyService.name);

  private async nextQuestionPosition(tx: Tx, testId: number) {
    const last = await tx.question.findFirst({ where: { testId }, orderBy: { position: 'desc' }, select: { position: true } });
    return (last?.position ?? -1) + 1;
  }

  private async nextProblemPosition(tx: Tx, testId: number) {
    const last = await tx.problem.findFirst({ where: { testId }, orderBy: { position: 'desc' }, select: { position: true } });
    return (last?.position ?? -1) + 1;
  }

  async copyQuestion(tx: Tx, sourceQuestionId: number, targetTestId: number) {
    const q = await tx.question.findUnique({ where: { id: sourceQuestionId }, include: { options: { orderBy: { position: 'asc' } } } });
    if (!q) throw new NotFoundException('Question not found.');
    return tx.question.create({
      data: {
        testId: targetTestId,
        text: q.text,
        position: await this.nextQuestionPosition(tx, targetTestId),
        options: { create: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect, position: o.position })) },
      },
      include: { options: { orderBy: { position: 'asc' } } },
    });
  }

  async copyProblem(tx: Tx, sourceProblemId: number, targetTestId: number) {
    const p = await tx.problem.findUnique({ where: { id: sourceProblemId }, include: { testCases: { orderBy: { position: 'asc' } } } });
    if (!p) throw new NotFoundException('Problem not found.');
    return tx.problem.create({
      data: {
        testId: targetTestId,
        title: p.title,
        description: p.description,
        functionName: p.functionName,
        points: p.points,
        position: await this.nextProblemPosition(tx, targetTestId),
        testCases: {
          create: p.testCases.map((c) => ({
            visibility: c.visibility,
            args: c.args as Prisma.InputJsonValue,
            expected: c.expected as Prisma.InputJsonValue,
            position: c.position,
          })),
        },
      },
      include: { testCases: { orderBy: { position: 'asc' } } },
    });
  }

  /** Appends every question or problem of the source test to the target test. */
  async copyTestContent(tx: Tx, sourceTestId: number, targetTestId: number) {
    const source = await tx.test.findUnique({ where: { id: sourceTestId } });
    if (!source) throw new NotFoundException('Test not found.');
    if (source.type === 'MCQ') {
      const ids = await tx.question.findMany({ where: { testId: sourceTestId }, orderBy: { position: 'asc' }, select: { id: true } });
      for (const { id } of ids) await this.copyQuestion(tx, id, targetTestId);
    } else {
      const ids = await tx.problem.findMany({ where: { testId: sourceTestId }, orderBy: { position: 'asc' }, select: { id: true } });
      for (const { id } of ids) await this.copyProblem(tx, id, targetTestId);
    }
    await tx.test.update({ where: { id: targetTestId }, data: { sourceTestId } });
    this.logger.log(`Content copied: test ${sourceTestId} -> test ${targetTestId}`);
  }

  /** Creates the three DRAFT tests of a new cohort, optionally copied from another cohort (A-2). */
  async createCohortTests(tx: Tx, cohortId: number, copyFromCohortId?: number) {
    for (const t of DEFAULT_TESTS) {
      const source = copyFromCohortId
        ? await tx.test.findUnique({ where: { cohortId_order: { cohortId: copyFromCohortId, order: t.order } } })
        : null;
      const test = await tx.test.create({
        data: {
          cohortId,
          order: t.order,
          type: t.type,
          title: source?.title ?? t.title,
          durationMinutes: source?.durationMinutes ?? t.durationMinutes,
          status: 'DRAFT',
        },
      });
      if (source && source.type === test.type) await this.copyTestContent(tx, source.id, test.id);
    }
  }
}
