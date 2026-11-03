import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AttemptStateService, MSG_SUBMITTED } from '../attempt-state/attempt-state.service';
import { ClockService } from '../common/clock.service';
import { round1 } from '../common/round.util';
import { PrismaService } from '../prisma/prisma.service';
import { McqAnswerDto } from './dto/mcq-answer.dto';
import { McqSubmitDto } from './dto/mcq-submit.dto';

const MSG_QUESTION = 'An answer refers to a question that is not part of this test.';
const MSG_OPTION = 'An answer refers to an option that does not belong to its question.';

@Injectable()
export class McqService {
  private readonly logger = new Logger(McqService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
    private readonly attemptState: AttemptStateService,
  ) {}

  private async load(userId: number, attemptId: number) {
    const attempt = await this.prisma.attempt.findFirst({
      where: { id: attemptId, userId },
      include: { test: { include: { questions: { include: { options: { select: { id: true, isCorrect: true } } } } } } },
    });
    if (!attempt) throw new NotFoundException('Attempt not found.');
    if (attempt.test.type !== 'MCQ') throw new BadRequestException('This action is only for MCQ tests.');
    await this.attemptState.assertAcceptingRequests(attempt);
    return attempt;
  }

  async saveAnswer(userId: number, attemptId: number, questionId: number, dto: McqAnswerDto) {
    const attempt = await this.load(userId, attemptId);
    const question = attempt.test.questions.find((q) => q.id === questionId);
    if (!question) throw new BadRequestException(MSG_QUESTION);
    const option = dto.optionId === null ? null : question.options.find((o) => o.id === dto.optionId);
    if (dto.optionId !== null && !option) throw new BadRequestException(MSG_OPTION);
    const isCorrect = option?.isCorrect ?? false;
    await this.prisma.mcqAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId } },
      create: { attemptId, questionId, optionId: dto.optionId, isCorrect },
      update: { optionId: dto.optionId, isCorrect },
    });
    return { questionId, optionId: dto.optionId, savedAt: this.clock.now() };
  }

  async submit(userId: number, attemptId: number, dto: McqSubmitDto) {
    const attempt = await this.load(userId, attemptId);
    const questions = attempt.test.questions;
    const chosen = new Map<number, number>();
    for (const a of dto.answers) {
      if (chosen.has(a.questionId)) throw new BadRequestException('Each question can be answered only once.');
      const q = questions.find((x) => x.id === a.questionId);
      if (!q) throw new BadRequestException(MSG_QUESTION);
      if (!q.options.some((o) => o.id === a.optionId)) throw new BadRequestException(MSG_OPTION);
      chosen.set(a.questionId, a.optionId);
    }
    const rows = questions.map((q) => {
      const optionId = chosen.get(q.id) ?? null;
      return { attemptId, questionId: q.id, optionId, isCorrect: q.options.some((o) => o.id === optionId && o.isCorrect) };
    });
    const correctCount = rows.filter((r) => r.isCorrect).length;
    const totalCount = questions.length;
    const score = totalCount ? round1((correctCount / totalCount) * 100) : 0;
    const submittedAt = this.clock.now();

    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.attempt.updateMany({
        where: { id: attemptId, status: 'IN_PROGRESS' },
        data: { status: 'SUBMITTED', score, submittedAt },
      });
      if (claimed.count !== 1) throw new ConflictException(MSG_SUBMITTED);
      await tx.mcqAnswer.deleteMany({ where: { attemptId } });
      await tx.mcqAnswer.createMany({ data: rows });
    });
    this.logger.log(`MCQ submitted: attempt ${attemptId}, score ${score}`);
    return {
      attemptId,
      status: 'SUBMITTED',
      correctCount,
      totalCount,
      score,
      label: `${correctCount} / ${totalCount} correct (${score}%)`,
      submittedAt,
    };
  }
}
