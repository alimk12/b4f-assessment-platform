import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { MSG_NO_COHORT_ACCESS } from './constants';

type Caller = Pick<JwtPayload, 'sub' | 'role'>;

/**
 * Alpha A-4: an instructor works only inside the cohorts they are linked to. ADMIN passes every check.
 * Every instructor service calls one of these methods before reading or changing data.
 */
@Injectable()
export class CohortAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** The caller's cohort ids, or `null` for ADMIN (= every cohort). */
  async listCohortIds(user: Caller): Promise<number[] | null> {
    if (user.role === 'ADMIN') return null;
    const links = await this.prisma.cohortInstructor.findMany({ where: { userId: user.sub }, select: { cohortId: true } });
    return links.map((l) => l.cohortId);
  }

  /** Prisma `where` fragment that limits a query to the caller's cohorts. */
  async cohortFilter(user: Caller): Promise<{ in: number[] } | undefined> {
    const ids = await this.listCohortIds(user);
    return ids === null ? undefined : { in: ids };
  }

  async canAccess(user: Caller, cohortId: number): Promise<boolean> {
    if (user.role === 'ADMIN') return true;
    const link = await this.prisma.cohortInstructor.findUnique({ where: { cohortId_userId: { cohortId, userId: user.sub } } });
    return !!link;
  }

  async assertCohort(user: Caller, cohortId: number) {
    const cohort = await this.prisma.cohort.findUnique({ where: { id: cohortId } });
    if (!cohort) throw new NotFoundException('Cohort not found.');
    if (!(await this.canAccess(user, cohortId))) throw new ForbiddenException(MSG_NO_COHORT_ACCESS);
    return cohort;
  }

  async assertTest(user: Caller, testId: number) {
    const test = await this.prisma.test.findUnique({ where: { id: testId } });
    if (!test) throw new NotFoundException('Test not found.');
    if (!(await this.canAccess(user, test.cohortId))) throw new ForbiddenException(MSG_NO_COHORT_ACCESS);
    return test;
  }

  async assertQuestion(user: Caller, questionId: number) {
    const q = await this.prisma.question.findUnique({ where: { id: questionId }, include: { test: { select: { cohortId: true } } } });
    if (!q) throw new NotFoundException('Question not found.');
    if (!(await this.canAccess(user, q.test.cohortId))) throw new ForbiddenException(MSG_NO_COHORT_ACCESS);
    return q;
  }

  async assertProblem(user: Caller, problemId: number) {
    const p = await this.prisma.problem.findUnique({ where: { id: problemId }, include: { test: { select: { cohortId: true } } } });
    if (!p) throw new NotFoundException('Problem not found.');
    if (!(await this.canAccess(user, p.test.cohortId))) throw new ForbiddenException(MSG_NO_COHORT_ACCESS);
    return p;
  }

  async assertAttempt(user: Caller, attemptId: number) {
    const a = await this.prisma.attempt.findUnique({ where: { id: attemptId }, include: { test: { select: { cohortId: true } } } });
    if (!a) throw new NotFoundException('Attempt not found.');
    if (!(await this.canAccess(user, a.test.cohortId))) throw new ForbiddenException(MSG_NO_COHORT_ACCESS);
    return a;
  }

  /** A student outside the caller's cohorts is reported as not found (never reveals other cohorts). */
  async assertStudent(user: Caller, studentId: number) {
    const s = await this.prisma.user.findUnique({ where: { id: studentId } });
    if (!s || s.role !== 'STUDENT' || s.cohortId === null || !(await this.canAccess(user, s.cohortId))) {
      throw new NotFoundException('Student not found.');
    }
    return s;
  }
}
