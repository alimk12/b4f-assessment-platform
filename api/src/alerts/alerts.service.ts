import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AlertType, Prisma } from '@prisma/client';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { ClockService } from '../common/clock.service';
import { CohortAccessService } from '../common/cohort-access.service';
import { MSG_NO_COHORT_ACCESS } from '../common/constants';
import { pageArgs, paginated } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { alertMessage, terminationAlertMessage } from './alert-messages';
import { AlertsQueryDto } from './dto/alerts-query.dto';

type Tx = Prisma.TransactionClient;

/** What an alert needs to know about the attempt it describes. */
export interface AlertContext {
  attemptId: number;
  cohortId: number;
  studentId: number;
  studentName: string;
  testTitle: string;
}

const include = {
  student: { select: { id: true, fullName: true, email: true } },
  attempt: { select: { test: { select: { id: true, title: true } } } },
  readBy: { select: { id: true, fullName: true } },
} satisfies Prisma.AlertInclude;

type Row = Prisma.AlertGetPayload<{ include: typeof include }>;

const toAlert = (a: Row) => ({
  id: a.id,
  type: a.type,
  severity: a.severity,
  message: a.message,
  student: a.student,
  test: a.attempt.test,
  attemptId: a.attemptId,
  cohortId: a.cohortId,
  createdAt: a.createdAt,
  readAt: a.readAt,
  readBy: a.readBy,
});

/** Permanent instructor alerts (A-7). Created inside the violation / termination transaction. */
@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
    private readonly access: CohortAccessService,
  ) {}

  /** Loads the AlertContext of an attempt (inside the caller's transaction). */
  async context(tx: Tx, attemptId: number): Promise<AlertContext> {
    const a = await tx.attempt.findUniqueOrThrow({
      where: { id: attemptId },
      select: { id: true, userId: true, user: { select: { fullName: true } }, test: { select: { title: true, cohortId: true } } },
    });
    return { attemptId: a.id, cohortId: a.test.cohortId, studentId: a.userId, studentName: a.user.fullName, testTitle: a.test.title };
  }

  /** One alert per **counted** violation: DEVICE_SWITCH is DANGER, everything else WARNING. */
  async createForViolation(tx: Tx, ctx: AlertContext, type: Exclude<AlertType, 'ATTEMPT_TERMINATED'>, n: number) {
    await tx.alert.create({
      data: {
        cohortId: ctx.cohortId,
        attemptId: ctx.attemptId,
        studentId: ctx.studentId,
        type,
        severity: type === 'DEVICE_SWITCH' ? 'DANGER' : 'WARNING',
        message: alertMessage(type, ctx.studentName, ctx.testTitle, n),
        createdAt: this.clock.now(),
      },
    });
    this.logger.log(`Alert created: attempt ${ctx.attemptId}, ${type}`);
  }

  async createForTermination(tx: Tx, ctx: AlertContext, reason: string) {
    await tx.alert.create({
      data: {
        cohortId: ctx.cohortId,
        attemptId: ctx.attemptId,
        studentId: ctx.studentId,
        type: 'ATTEMPT_TERMINATED',
        severity: 'DANGER',
        message: terminationAlertMessage(ctx.studentName, ctx.testTitle, reason),
        createdAt: this.clock.now(),
      },
    });
    this.logger.log(`Alert created: attempt ${ctx.attemptId}, ATTEMPT_TERMINATED`);
  }

  async list(user: JwtPayload, q: AlertsQueryDto) {
    await this.access.assertCohort(user, q.cohortId);
    const where: Prisma.AlertWhereInput = {
      cohortId: q.cohortId,
      ...(q.severity ? { severity: q.severity } : {}),
      ...(q.unread === true ? { readAt: null } : {}),
    };
    const { skip, take } = pageArgs(q);
    const [rows, total] = await Promise.all([
      this.prisma.alert.findMany({ where, include, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip, take }),
      this.prisma.alert.count({ where }),
    ]);
    return paginated(rows.map(toAlert), total, q);
  }

  async unreadCount(user: JwtPayload, cohortId?: number) {
    let cohortFilter: Prisma.IntFilter | number | undefined;
    if (cohortId) {
      await this.access.assertCohort(user, cohortId);
      cohortFilter = cohortId;
    } else {
      cohortFilter = await this.access.cohortFilter(user);
    }
    const where: Prisma.AlertWhereInput = { readAt: null, ...(cohortFilter !== undefined ? { cohortId: cohortFilter } : {}) };
    const [count, dangerCount] = await Promise.all([
      this.prisma.alert.count({ where }),
      this.prisma.alert.count({ where: { ...where, severity: 'DANGER' } }),
    ]);
    return { count, dangerCount };
  }

  async markRead(user: JwtPayload, alertId: number) {
    const alert = await this.prisma.alert.findUnique({ where: { id: alertId } });
    if (!alert) throw new NotFoundException('Alert not found.');
    if (!(await this.access.canAccess(user, alert.cohortId))) throw new ForbiddenException(MSG_NO_COHORT_ACCESS);
    if (!alert.readAt) {
      await this.prisma.alert.update({ where: { id: alertId }, data: { readAt: this.clock.now(), readById: user.sub } });
    }
    return toAlert(await this.prisma.alert.findUniqueOrThrow({ where: { id: alertId }, include }));
  }

  async markAllRead(user: JwtPayload, cohortId: number) {
    await this.access.assertCohort(user, cohortId);
    const { count } = await this.prisma.alert.updateMany({
      where: { cohortId, readAt: null },
      data: { readAt: this.clock.now(), readById: user.sub },
    });
    return { updated: count };
  }
}
