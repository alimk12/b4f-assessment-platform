/*
 * Attempt state table (server owns every transition):
 *
 *   state        | request                         | result
 *   -------------+---------------------------------+------------------------------------------------------
 *   (none)       | start (published, unlocked)     | IN_PROGRESS, startedAt = now, deadline = now + duration
 *   IN_PROGRESS  | start again                     | same attempt, same deadline, new session key
 *   IN_PROGRESS  | any action <= deadline + 10 s   | accepted
 *   IN_PROGRESS  | any action  > deadline + 10 s   | stored EXPIRED (score null), 409 "Time is over..."
 *   IN_PROGRESS  | any read after deadline + 10 s  | expireOverdue() stores EXPIRED first (R-9)
 *   IN_PROGRESS  | MCQ submit / coding finish      | SUBMITTED with score (one transaction)
 *   IN_PROGRESS  | 2nd FOCUS / 3rd CLIPBOARD       | TERMINATED with the score of what was saved
 *   SUBMITTED    | any action                      | 409 "This test has already been submitted."
 *   TERMINATED   | any action                      | 409 "This attempt was ended because the exam rules were broken."
 *   EXPIRED      | any action                      | 409 "Time is over..."
 */
import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Attempt } from '@prisma/client';
import { ClockService } from '../common/clock.service';
import { GRACE_SECONDS } from '../common/constants';
import { PrismaService } from '../prisma/prisma.service';

export const MSG_SUBMITTED = 'This test has already been submitted.';
export const MSG_TERMINATED = 'This attempt was ended because the exam rules were broken.';
export const MSG_TIME_OVER = 'Time is over. This attempt expired and was not submitted.';

@Injectable()
export class AttemptStateService {
  private readonly logger = new Logger(AttemptStateService.name);

  constructor(private readonly prisma: PrismaService, private readonly clock: ClockService) {}

  isOverdue(attempt: Pick<Attempt, 'status' | 'deadline'>, now = this.clock.now()): boolean {
    return attempt.status === 'IN_PROGRESS' && now.getTime() > attempt.deadline.getTime() + GRACE_SECONDS * 1000;
  }

  async expireOverdue(): Promise<number> {
    const limit = new Date(this.clock.now().getTime() - GRACE_SECONDS * 1000);
    const { count } = await this.prisma.attempt.updateMany({
      where: { status: 'IN_PROGRESS', deadline: { lt: limit } },
      data: { status: 'EXPIRED', score: null },
    });
    if (count) this.logger.log(`Attempts expired: ${count}`);
    return count;
  }

  async assertAcceptingRequests(attempt: Pick<Attempt, 'id' | 'status' | 'deadline'>): Promise<void> {
    if (attempt.status === 'SUBMITTED') throw new ConflictException(MSG_SUBMITTED);
    if (attempt.status === 'TERMINATED') throw new ConflictException(MSG_TERMINATED);
    if (attempt.status === 'EXPIRED') throw new ConflictException(MSG_TIME_OVER);
    if (this.isOverdue(attempt)) {
      await this.prisma.attempt.updateMany({
        where: { id: attempt.id, status: 'IN_PROGRESS' },
        data: { status: 'EXPIRED', score: null },
      });
      this.logger.warn(`Late request rejected, attempt ${attempt.id} expired`);
      throw new ConflictException(MSG_TIME_OVER);
    }
  }

  async hasAttempts(testId: number): Promise<boolean> {
    return (await this.prisma.attempt.count({ where: { testId } })) > 0;
  }

  async hasActiveAttempts(testId: number): Promise<boolean> {
    await this.expireOverdue();
    return (await this.prisma.attempt.count({ where: { testId, status: 'IN_PROGRESS' } })) > 0;
  }
}
