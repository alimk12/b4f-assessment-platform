import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MIN_HIDDEN_CASES, MIN_SAMPLE_CASES } from '../common/constants';
import { PrismaService } from '../prisma/prisma.service';
import { ProblemDto } from './dto/problem.dto';
import { InstructorTestsService } from './instructor-tests.service';
import { toInstructorProblem } from './mappers/instructor-test.mapper';

@Injectable()
export class ProblemsService {
  constructor(private readonly prisma: PrismaService, private readonly tests: InstructorTestsService) {}

  private checkCases(dto: ProblemDto) {
    if (dto.testCases.filter((c) => c.visibility === 'SAMPLE').length < MIN_SAMPLE_CASES)
      throw new BadRequestException(`A problem needs at least ${MIN_SAMPLE_CASES} sample test case.`);
    if (dto.testCases.filter((c) => c.visibility === 'HIDDEN').length < MIN_HIDDEN_CASES)
      throw new BadRequestException(`A problem needs at least ${MIN_HIDDEN_CASES} hidden test cases.`);
  }

  private cases(dto: ProblemDto) {
    return dto.testCases.map((c, i) => ({
      visibility: c.visibility,
      args: c.args as Prisma.InputJsonValue,
      expected: (c.expected === undefined ? null : c.expected) as Prisma.InputJsonValue,
      position: i,
    }));
  }

  async create(testId: number, dto: ProblemDto) {
    const test = await this.prisma.test.findUnique({ where: { id: testId } });
    if (!test) throw new NotFoundException('Test not found.');
    if (test.type !== 'CODING') throw new BadRequestException('Problems can only be added to a coding test.');
    await this.tests.assertContentEditable(testId);
    this.checkCases(dto);
    const last = await this.prisma.problem.findFirst({ where: { testId }, orderBy: { position: 'desc' } });
    const p = await this.prisma.problem.create({
      data: {
        testId,
        title: dto.title,
        description: dto.description,
        functionName: dto.functionName,
        points: dto.points,
        position: (last?.position ?? -1) + 1,
        testCases: { create: this.cases(dto) },
      },
      include: { testCases: { orderBy: { position: 'asc' } } },
    });
    return toInstructorProblem(p);
  }

  async replace(problemId: number, dto: ProblemDto) {
    const existing = await this.prisma.problem.findUnique({ where: { id: problemId } });
    if (!existing) throw new NotFoundException('Problem not found.');
    await this.tests.assertContentEditable(existing.testId);
    this.checkCases(dto);
    const p = await this.prisma.$transaction(async (tx) => {
      await tx.testCase.deleteMany({ where: { problemId } });
      return tx.problem.update({
        where: { id: problemId },
        data: {
          title: dto.title,
          description: dto.description,
          functionName: dto.functionName,
          points: dto.points,
          testCases: { create: this.cases(dto) },
        },
        include: { testCases: { orderBy: { position: 'asc' } } },
      });
    });
    return toInstructorProblem(p);
  }

  async remove(problemId: number) {
    const existing = await this.prisma.problem.findUnique({ where: { id: problemId } });
    if (!existing) throw new NotFoundException('Problem not found.');
    await this.tests.assertContentEditable(existing.testId);
    await this.prisma.problem.delete({ where: { id: problemId } });
    return { message: 'Problem deleted.' };
  }
}
