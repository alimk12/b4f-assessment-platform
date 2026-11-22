import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { CohortAccessService } from '../common/cohort-access.service';
import { pageArgs, paginated } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { InstructorTestsService } from '../tests/instructor-tests.service';
import { BankQueryDto } from './dto/bank-query.dto';

const include = {
  cohort: { include: { city: true } },
  _count: { select: { questions: true, problems: true } },
} satisfies Prisma.TestInclude;

type Row = Prisma.TestGetPayload<{ include: typeof include }>;

/** The shared, read-only question bank: every test of every cohort (A-12). Never reachable by students. */
@Injectable()
export class BankService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CohortAccessService,
    private readonly tests: InstructorTestsService,
  ) {}

  private toSummary(t: Row, mine: number[] | null) {
    return {
      id: t.id,
      title: t.title,
      type: t.type,
      order: t.order,
      status: t.status,
      cohort: { id: t.cohort.id, name: t.cohort.name, status: t.cohort.status },
      city: { id: t.cohort.city.id, name: t.cohort.city.name },
      questionCount: t._count.questions,
      problemCount: t._count.problems,
      isMine: mine === null || mine.includes(t.cohortId),
    };
  }

  async list(user: JwtPayload, q: BankQueryDto) {
    const where: Prisma.TestWhereInput = {
      ...(q.cohortId ? { cohortId: q.cohortId } : {}),
      ...(q.cityId ? { cohort: { cityId: q.cityId } } : {}),
      ...(q.type ? { type: q.type } : {}),
      ...(q.search
        ? {
            OR: [
              { title: { contains: q.search, mode: 'insensitive' } },
              { questions: { some: { text: { contains: q.search, mode: 'insensitive' } } } },
              { problems: { some: { title: { contains: q.search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };
    const { skip, take } = pageArgs(q);
    const [rows, total, mine] = await Promise.all([
      this.prisma.test.findMany({ where, include, orderBy: [{ cohort: { createdAt: 'desc' } }, { order: 'asc' }], skip, take }),
      this.prisma.test.count({ where }),
      this.access.listCohortIds(user),
    ]);
    return paginated(
      rows.map((t) => this.toSummary(t, mine)),
      total,
      q,
    );
  }

  /** Full instructor content (correct options, every test case) of any cohort's test. */
  async getDetail(user: JwtPayload, testId: number) {
    const t = await this.prisma.test.findUnique({ where: { id: testId }, include });
    if (!t) throw new NotFoundException('Test not found.');
    const summary = this.toSummary(t, await this.access.listCohortIds(user));
    const detail = await this.tests.findOne(testId);
    return { ...detail, cohort: summary.cohort, city: summary.city, isMine: summary.isMine };
  }
}
