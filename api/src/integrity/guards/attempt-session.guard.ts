import { CanActivate, ConflictException, ExecutionContext, Injectable } from '@nestjs/common';
import { ATTEMPT_SESSION_HEADER } from '../../common/constants';
import { PrismaService } from '../../prisma/prisma.service';

export const MSG_OTHER_SESSION =
  'This attempt is open in another window or device. Open it again from My Tests to continue here.';

/** Only one browser session may act on an IN_PROGRESS attempt (API.md 19.4). */
@Injectable()
export class AttemptSessionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const attemptId = Number(request.params?.attemptId);
    if (!Number.isInteger(attemptId) || attemptId < 1) return true;
    const attempt = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
      select: { userId: true, status: true, sessionKey: true },
    });
    if (!attempt || attempt.userId !== request.user?.sub || attempt.status !== 'IN_PROGRESS') return true;
    if (request.headers[ATTEMPT_SESSION_HEADER] !== attempt.sessionKey) throw new ConflictException(MSG_OTHER_SESSION);
    return true;
  }
}
