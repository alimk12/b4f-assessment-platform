import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AttemptStateService } from '../attempt-state/attempt-state.service';
import { MSG_EMAIL_TAKEN } from '../auth/auth.service';
import { SessionService } from '../auth/session.service';
import { ClockService } from '../common/clock.service';
import { pageArgs, paginated } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CopyService } from '../tests/copy.service';
import {
  CohortsQueryDto,
  CreateCityDto,
  CreateCohortDto,
  CreateInstructorDto,
  InstructorsQueryDto,
  UpdateInstructorDto,
} from './dto/admin.dto';
import { generateJoinCode } from './join-code.util';

const cohortInclude = {
  city: true,
  instructors: { include: { user: { select: { id: true, fullName: true } } }, orderBy: { createdAt: 'asc' as const } },
  _count: { select: { students: true } },
} satisfies Prisma.CohortInclude;

type CohortRow = Prisma.CohortGetPayload<{ include: typeof cohortInclude }>;

/** The Cohort shape of API.md §20.4. */
export const toCohort = (c: CohortRow) => ({
  id: c.id,
  name: c.name,
  city: { id: c.city.id, name: c.city.name },
  joinCode: c.joinCode,
  status: c.status,
  studentCount: c._count.students,
  instructors: c.instructors.map((i) => ({ id: i.user.id, fullName: i.user.fullName })),
  createdAt: c.createdAt,
  archivedAt: c.archivedAt,
});

const instructorInclude = {
  instructorCohorts: { include: { cohort: { include: { city: true } } }, orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.UserInclude;

type InstructorRow = Prisma.UserGetPayload<{ include: typeof instructorInclude }>;

const toInstructor = (u: InstructorRow) => ({
  id: u.id,
  fullName: u.fullName,
  email: u.email,
  isActive: u.isActive,
  cohorts: u.instructorCohorts.map((l) => ({ id: l.cohort.id, name: l.cohort.name, city: l.cohort.city.name })),
  createdAt: u.createdAt,
});

/** ADMIN: cities, cohorts, join codes, instructors and their cohorts (A-10). */
@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
    private readonly attemptState: AttemptStateService,
    private readonly sessions: SessionService,
    private readonly copy: CopyService,
  ) {}

  // ---------- Cities ----------

  async listCities() {
    const cities = await this.prisma.city.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { cohorts: true } } } });
    return cities.map((c) => ({ id: c.id, name: c.name, cohortCount: c._count.cohorts }));
  }

  async createCity(dto: CreateCityDto) {
    const taken = await this.prisma.city.findFirst({ where: { name: { equals: dto.name, mode: 'insensitive' } } });
    if (taken) throw new ConflictException('A city with this name already exists.');
    const city = await this.prisma.city.create({ data: { name: dto.name } });
    this.logger.log(`City created: ${city.id}`);
    return { id: city.id, name: city.name, cohortCount: 0 };
  }

  // ---------- Cohorts ----------

  async getCohort(cohortId: number) {
    const c = await this.prisma.cohort.findUnique({ where: { id: cohortId }, include: cohortInclude });
    if (!c) throw new NotFoundException('Cohort not found.');
    return toCohort(c);
  }

  async listCohorts(q: CohortsQueryDto) {
    const where: Prisma.CohortWhereInput = { ...(q.cityId ? { cityId: q.cityId } : {}), ...(q.status ? { status: q.status } : {}) };
    const { skip, take } = pageArgs(q);
    const [rows, total] = await Promise.all([
      this.prisma.cohort.findMany({ where, include: cohortInclude, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.cohort.count({ where }),
    ]);
    return paginated(rows.map(toCohort), total, q);
  }

  private async uniqueJoinCode(tx: Prisma.TransactionClient) {
    for (;;) {
      const code = generateJoinCode();
      if (!(await tx.cohort.findUnique({ where: { joinCode: code } }))) return code;
    }
  }

  async createCohort(dto: CreateCohortDto) {
    const city = await this.prisma.city.findUnique({ where: { id: dto.cityId } });
    if (!city) throw new NotFoundException('City not found.');
    if (dto.copyFromCohortId && !(await this.prisma.cohort.findUnique({ where: { id: dto.copyFromCohortId } })))
      throw new NotFoundException('Cohort not found.');
    const taken = await this.prisma.cohort.findFirst({
      where: { cityId: dto.cityId, name: { equals: dto.name, mode: 'insensitive' } },
    });
    if (taken) throw new ConflictException('This city already has a cohort with this name.');

    // One transaction: the cohort, its join code and its three DRAFT tests (with copied content).
    const cohort = await this.prisma.$transaction(
      async (tx) => {
        const created = await tx.cohort.create({ data: { name: dto.name, cityId: dto.cityId, joinCode: await this.uniqueJoinCode(tx) } });
        await this.copy.createCohortTests(tx, created.id, dto.copyFromCohortId);
        return created;
      },
      { timeout: 30_000 },
    );
    this.logger.log(`Cohort created: ${cohort.id}${dto.copyFromCohortId ? ` (copied from ${dto.copyFromCohortId})` : ''}`);
    return this.getCohort(cohort.id);
  }

  async archiveCohort(cohortId: number) {
    const cohort = await this.prisma.cohort.findUnique({ where: { id: cohortId } });
    if (!cohort) throw new NotFoundException('Cohort not found.');
    if (cohort.status === 'ARCHIVED') throw new ConflictException('This cohort is already archived.');
    await this.attemptState.expireOverdue();
    const running = await this.prisma.attempt.count({ where: { status: 'IN_PROGRESS', test: { cohortId } } });
    if (running) throw new ConflictException('This cohort cannot be archived while a student is taking a test.');
    await this.prisma.cohort.update({ where: { id: cohortId }, data: { status: 'ARCHIVED', archivedAt: this.clock.now() } });
    this.logger.log(`Cohort archived: ${cohortId}`);
    return this.getCohort(cohortId);
  }

  async regenerateJoinCode(cohortId: number) {
    const cohort = await this.prisma.cohort.findUnique({ where: { id: cohortId } });
    if (!cohort) throw new NotFoundException('Cohort not found.');
    await this.prisma.$transaction(async (tx) =>
      tx.cohort.update({ where: { id: cohortId }, data: { joinCode: await this.uniqueJoinCode(tx) } }),
    );
    this.logger.log(`Join code changed: cohort ${cohortId}`);
    return this.getCohort(cohortId);
  }

  // ---------- Instructors ----------

  private async getInstructor(userId: number) {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, include: instructorInclude });
    if (!u || u.role !== 'INSTRUCTOR') throw new NotFoundException('Instructor not found.');
    return u;
  }

  async listInstructors(q: InstructorsQueryDto) {
    const where: Prisma.UserWhereInput = {
      role: 'INSTRUCTOR',
      ...(q.search
        ? { OR: [{ fullName: { contains: q.search, mode: 'insensitive' } }, { email: { contains: q.search, mode: 'insensitive' } }] }
        : {}),
    };
    const { skip, take } = pageArgs(q);
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({ where, include: instructorInclude, orderBy: { fullName: 'asc' }, skip, take }),
      this.prisma.user.count({ where }),
    ]);
    return paginated(rows.map(toInstructor), total, q);
  }

  async createInstructor(dto: CreateInstructorDto) {
    if (await this.prisma.user.findUnique({ where: { email: dto.email } })) throw new ConflictException(MSG_EMAIL_TAKEN);
    const cohortIds = dto.cohortIds ?? [];
    if (cohortIds.length && (await this.prisma.cohort.count({ where: { id: { in: cohortIds } } })) !== cohortIds.length)
      throw new NotFoundException('Cohort not found.');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    try {
      const user = await this.prisma.user.create({
        data: {
          fullName: dto.fullName,
          email: dto.email,
          passwordHash,
          role: 'INSTRUCTOR',
          instructorCohorts: { create: cohortIds.map((cohortId) => ({ cohortId })) },
        },
      });
      this.logger.log(`Instructor created: ${user.id}`);
      return toInstructor(await this.getInstructor(user.id));
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException(MSG_EMAIL_TAKEN);
      throw e;
    }
  }

  async updateInstructor(userId: number, dto: UpdateInstructorDto) {
    const existing = await this.getInstructor(userId);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    if (dto.isActive === false && existing.isActive) {
      await this.sessions.revokeAll(userId, 'DISABLED');
      this.logger.log(`Instructor disabled: ${userId}`);
    }
    return toInstructor(await this.getInstructor(userId));
  }

  async linkInstructor(cohortId: number, userId: number) {
    await this.getCohort(cohortId);
    await this.getInstructor(userId);
    const link = await this.prisma.cohortInstructor.findUnique({ where: { cohortId_userId: { cohortId, userId } } });
    if (link) throw new ConflictException('This instructor is already linked to this cohort.');
    await this.prisma.cohortInstructor.create({ data: { cohortId, userId } });
    this.logger.log(`Instructor linked: ${userId} -> cohort ${cohortId}`);
    return this.getCohort(cohortId);
  }

  async unlinkInstructor(cohortId: number, userId: number) {
    await this.getCohort(cohortId);
    const link = await this.prisma.cohortInstructor.findUnique({ where: { cohortId_userId: { cohortId, userId } } });
    if (!link) throw new NotFoundException('This instructor is not linked to this cohort.');
    await this.prisma.cohortInstructor.delete({ where: { cohortId_userId: { cohortId, userId } } });
    this.logger.log(`Instructor unlinked: ${userId} -> cohort ${cohortId}`);
    return this.getCohort(cohortId);
  }

  // ---------- Instructor's own cohorts ----------

  /** GET /instructor/cohorts: the caller's cohorts (every cohort for ADMIN), active first. */
  async cohortsFor(cohortIds: number[] | null) {
    const rows = await this.prisma.cohort.findMany({
      where: cohortIds === null ? {} : { id: { in: cohortIds } },
      include: cohortInclude,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
    return rows.map(toCohort);
  }
}
