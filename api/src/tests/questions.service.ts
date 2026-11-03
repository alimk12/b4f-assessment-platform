import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuestionDto } from './dto/question.dto';
import { InstructorTestsService } from './instructor-tests.service';
import { toInstructorQuestion } from './mappers/instructor-test.mapper';

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService, private readonly tests: InstructorTestsService) {}

  private checkOptions(dto: QuestionDto) {
    if (dto.options.filter((o) => o.isCorrect).length !== 1)
      throw new BadRequestException('A question needs exactly one correct option.');
  }

  private options(dto: QuestionDto) {
    return dto.options.map((o, i) => ({ text: o.text, isCorrect: o.isCorrect, position: i }));
  }

  async create(testId: number, dto: QuestionDto) {
    const test = await this.prisma.test.findUnique({ where: { id: testId } });
    if (!test) throw new NotFoundException('Test not found.');
    if (test.type !== 'MCQ') throw new BadRequestException('Questions can only be added to an MCQ test.');
    await this.tests.assertContentEditable(testId);
    this.checkOptions(dto);
    const last = await this.prisma.question.findFirst({ where: { testId }, orderBy: { position: 'desc' } });
    const q = await this.prisma.question.create({
      data: { testId, text: dto.text, position: (last?.position ?? -1) + 1, options: { create: this.options(dto) } },
      include: { options: { orderBy: { position: 'asc' } } },
    });
    return toInstructorQuestion(q);
  }

  async replace(questionId: number, dto: QuestionDto) {
    const existing = await this.prisma.question.findUnique({ where: { id: questionId } });
    if (!existing) throw new NotFoundException('Question not found.');
    await this.tests.assertContentEditable(existing.testId);
    this.checkOptions(dto);
    const q = await this.prisma.$transaction(async (tx) => {
      await tx.option.deleteMany({ where: { questionId } });
      return tx.question.update({
        where: { id: questionId },
        data: { text: dto.text, options: { create: this.options(dto) } },
        include: { options: { orderBy: { position: 'asc' } } },
      });
    });
    return toInstructorQuestion(q);
  }

  async remove(questionId: number) {
    const existing = await this.prisma.question.findUnique({ where: { id: questionId } });
    if (!existing) throw new NotFoundException('Question not found.');
    await this.tests.assertContentEditable(existing.testId);
    await this.prisma.question.delete({ where: { id: questionId } });
    return { message: 'Question deleted.' };
  }
}
