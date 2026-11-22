import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { MSG_EMAIL_TAKEN } from '../auth/auth.service';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { SessionService } from '../auth/session.service';
import { CohortAccessService } from '../common/cohort-access.service';
import { pageArgs, paginated } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto, ResetPasswordDto, StudentsQueryDto, UpdateStudentDto } from './dto/cohort-students.dto';

/** An instructor manages the student accounts of their own cohorts (A-11). */
@Injectable()
export class CohortStudentsService {
  private readonly logger = new Logger(CohortStudentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CohortAccessService,
    private readonly sessions: SessionService,
  ) {}

  /** The StudentAccount shape of API.md §20.4. */
  private async toAccount(u: User & { _count?: { attempts: number } }) {
    const attemptCount = u._count?.attempts ?? (await this.prisma.attempt.count({ where: { userId: u.id } }));
    return {
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      isActive: u.isActive,
      cohortId: u.cohortId,
      attemptCount,
      lastSignInAt: await this.sessions.lastSignInAt(u.id),
      createdAt: u.createdAt,
    };
  }

  private rethrowEmailTaken(e: unknown): never {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException(MSG_EMAIL_TAKEN);
    throw e;
  }

  async list(user: JwtPayload, cohortId: number, q: StudentsQueryDto) {
    await this.access.assertCohort(user, cohortId);
    const where: Prisma.UserWhereInput = {
      role: 'STUDENT',
      cohortId,
      ...(q.status ? { isActive: q.status === 'ACTIVE' } : {}),
      ...(q.search
        ? { OR: [{ fullName: { contains: q.search, mode: 'insensitive' } }, { email: { contains: q.search, mode: 'insensitive' } }] }
        : {}),
    };
    const { skip, take } = pageArgs(q);
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({ where, include: { _count: { select: { attempts: true } } }, orderBy: { fullName: 'asc' }, skip, take }),
      this.prisma.user.count({ where }),
    ]);
    return paginated(await Promise.all(rows.map((r) => this.toAccount(r))), total, q);
  }

  async create(user: JwtPayload, cohortId: number, dto: CreateStudentDto) {
    const cohort = await this.access.assertCohort(user, cohortId);
    if (cohort.status === 'ARCHIVED') throw new ConflictException('This cohort is archived.');
    if (await this.prisma.user.findUnique({ where: { email: dto.email } })) throw new ConflictException(MSG_EMAIL_TAKEN);
    const passwordHash = await bcrypt.hash(dto.password, 10);
    try {
      const student = await this.prisma.user.create({
        data: { fullName: dto.fullName, email: dto.email, passwordHash, role: 'STUDENT', cohortId },
      });
      this.logger.log(`Student created by instructor ${user.sub}: ${student.id} (cohort ${cohortId})`);
      return this.toAccount(student);
    } catch (e) {
      this.rethrowEmailTaken(e);
    }
  }

  async update(user: JwtPayload, studentId: number, dto: UpdateStudentDto) {
    const existing = await this.access.assertStudent(user, studentId);
    if (dto.email !== undefined && dto.email !== existing.email && (await this.prisma.user.findUnique({ where: { email: dto.email } })))
      throw new ConflictException(MSG_EMAIL_TAKEN);
    try {
      const student = await this.prisma.user.update({
        where: { id: studentId },
        data: {
          ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
          ...(dto.email !== undefined ? { email: dto.email } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });
      if (dto.isActive === false && existing.isActive) {
        await this.sessions.revokeAll(studentId, 'DISABLED');
        this.logger.log(`Student disabled by instructor ${user.sub}: ${studentId}`);
      } else {
        this.logger.log(`Student updated by instructor ${user.sub}: ${studentId}`);
      }
      return this.toAccount(student);
    } catch (e) {
      this.rethrowEmailTaken(e);
    }
  }

  async resetPassword(user: JwtPayload, studentId: number, dto: ResetPasswordDto) {
    await this.access.assertStudent(user, studentId);
    await this.prisma.user.update({ where: { id: studentId }, data: { passwordHash: await bcrypt.hash(dto.newPassword, 10) } });
    await this.sessions.revokeAll(studentId, 'PASSWORD_RESET');
    this.logger.log(`Student password reset by instructor ${user.sub}: ${studentId}`);
  }

  async signOut(user: JwtPayload, studentId: number) {
    await this.access.assertStudent(user, studentId);
    await this.sessions.revokeAll(studentId, 'INSTRUCTOR');
    this.logger.log(`Student signed out by instructor ${user.sub}: ${studentId}`);
  }
}
