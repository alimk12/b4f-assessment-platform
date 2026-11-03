import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AttemptStateService } from '../attempt-state/attempt-state.service';
import { MIN_CODING_PROBLEMS_TO_PUBLISH, MIN_MCQ_QUESTIONS_TO_PUBLISH } from '../common/constants';
import { PrismaService } from '../prisma/prisma.service';
import { toInstructorProblem, toInstructorQuestion, toInstructorTestSummary } from './mappers/instructor-test.mapper';

@Injectable()
export class InstructorTestsService {
  private readonly logger = new Logger(InstructorTestsService.name);

  constructor(private readonly prisma: PrismaService, private readonly attemptState: AttemptStateService) {}

  private async summary(testId: number) {
    const t = await this.prisma.test.findUnique({ where: { id: testId } });
    if (!t) throw new NotFoundException('Test not found.');
    const [questionCount, problemCount, attemptCount, inProgressCount] = await Promise.all([
      this.prisma.question.count({ where: { testId } }),
      this.prisma.problem.count({ where: { testId } }),
      this.prisma.attempt.count({ where: { testId } }),
      this.prisma.attempt.count({ where: { testId, status: 'IN_PROGRESS' } }),
    ]);
    return { test: t, view: toInstructorTestSummary(t, { questionCount, problemCount, attemptCount, inProgressCount }) };
  }

  async findAll() {
    await this.attemptState.expireOverdue();
    const tests = await this.prisma.test.findMany({ orderBy: { order: 'asc' } });
    return Promise.all(tests.map(async (t) => (await this.summary(t.id)).view));
  }

  async findOne(testId: number) {
    await this.attemptState.expireOverdue();
    const { test, view } = await this.summary(testId);
    if (test.type === 'MCQ') {
      const questions = await this.prisma.question.findMany({
        where: { testId },
        orderBy: { position: 'asc' },
        include: { options: { orderBy: { position: 'asc' } } },
      });
      return { ...view, questions: questions.map(toInstructorQuestion) };
    }
    const problems = await this.prisma.problem.findMany({
      where: { testId },
      orderBy: { position: 'asc' },
      include: { testCases: { orderBy: { position: 'asc' } } },
    });
    return { ...view, problems: problems.map(toInstructorProblem) };
  }

  async publish(testId: number) {
    const { test, view } = await this.summary(testId);
    if (test.status === 'PUBLISHED') return view;
    if (test.type === 'MCQ' && view.questionCount < MIN_MCQ_QUESTIONS_TO_PUBLISH)
      throw new ConflictException(`An MCQ test needs at least ${MIN_MCQ_QUESTIONS_TO_PUBLISH} questions before it can be published.`);
    if (test.type === 'CODING' && view.problemCount < MIN_CODING_PROBLEMS_TO_PUBLISH)
      throw new ConflictException(`A coding test needs at least ${MIN_CODING_PROBLEMS_TO_PUBLISH} problem before it can be published.`);
    await this.prisma.test.update({ where: { id: testId }, data: { status: 'PUBLISHED' } });
    this.logger.log(`Test published: ${test.title}`);
    return (await this.summary(testId)).view;
  }

  async unpublish(testId: number) {
    const { test } = await this.summary(testId);
    if (await this.attemptState.hasActiveAttempts(testId))
      throw new ConflictException('This test cannot be unpublished while a student is taking it.');
    await this.prisma.test.update({ where: { id: testId }, data: { status: 'DRAFT' } });
    this.logger.log(`Test unpublished: ${test.title}`);
    return (await this.summary(testId)).view;
  }

  /** R-4: content is frozen once any student has an attempt for the test. */
  async assertContentEditable(testId: number) {
    if (await this.attemptState.hasAttempts(testId)) {
      this.logger.warn(`Content change rejected for test ${testId}`);
      throw new ConflictException('Questions and problems cannot be changed after a student has started this test.');
    }
  }
}
