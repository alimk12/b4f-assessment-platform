import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { ClockService } from '../common/clock.service';
import { MSG_SIGNED_OUT, MSG_SIGNED_OUT_OTHER_DEVICE, RevokeReason } from '../common/constants';
import { PrismaService } from '../prisma/prisma.service';

type Tx = Prisma.TransactionClient;

/** Sign-in sessions (Alpha A-9): one active session per student, revocable by the instructor. */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(private readonly prisma: PrismaService, private readonly clock: ClockService) {}

  /** Creates a session. A student's older sessions are revoked first (one sign-in per student). */
  async create(tx: Tx, userId: number, role: Role): Promise<number> {
    if (role === 'STUDENT') await this.revokeAll(userId, 'OTHER_DEVICE', undefined, tx);
    const session = await tx.userSession.create({ data: { userId } });
    this.logger.log(`Session created: user ${userId}`);
    return session.id;
  }

  /** Throws 401 with the right message when the session or the account is no longer valid. */
  async assertActive(sid: number | undefined, userId: number): Promise<void> {
    if (!sid) throw new UnauthorizedException('Please sign in to continue.');
    const session = await this.prisma.userSession.findUnique({
      where: { id: sid },
      select: { userId: true, revokedAt: true, revokeReason: true, user: { select: { isActive: true } } },
    });
    if (!session || session.userId !== userId) throw new UnauthorizedException('Please sign in to continue.');
    if (session.revokedAt) {
      throw new UnauthorizedException(session.revokeReason === 'OTHER_DEVICE' ? MSG_SIGNED_OUT_OTHER_DEVICE : MSG_SIGNED_OUT);
    }
    if (!session.user.isActive) throw new UnauthorizedException(MSG_SIGNED_OUT);
  }

  async revoke(sid: number, reason: RevokeReason): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { id: sid, revokedAt: null },
      data: { revokedAt: this.clock.now(), revokeReason: reason },
    });
  }

  /** Ends every active session of a user (optionally keeping one). */
  async revokeAll(userId: number, reason: RevokeReason, exceptSid?: number, tx: Tx = this.prisma): Promise<number> {
    const { count } = await tx.userSession.updateMany({
      where: { userId, revokedAt: null, ...(exceptSid ? { id: { not: exceptSid } } : {}) },
      data: { revokedAt: this.clock.now(), revokeReason: reason },
    });
    if (count) this.logger.log(`Sessions revoked: user ${userId}, ${count} (${reason})`);
    return count;
  }

  /** The newest sign-in time of a user (students page). */
  async lastSignInAt(userId: number): Promise<Date | null> {
    const s = await this.prisma.userSession.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
    return s?.createdAt ?? null;
  }
}
