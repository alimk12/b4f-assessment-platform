import { BadRequestException, Body, Controller, HttpCode, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { CohortAccessService } from '../common/cohort-access.service';
import { TestIdParamDto } from '../common/dto/id-param.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CopyService } from './copy.service';
import { CopyProblemDto, CopyQuestionDto, CopyTestDto } from './dto/copy.dto';
import { InstructorTestsService } from './instructor-tests.service';
import { toInstructorProblem, toInstructorQuestion } from './mappers/instructor-test.mapper';

const MSG_TYPE = 'You can only copy into a test of the same type.';

/** Copy from the question bank into one of my unlocked tests (A-12). The source never changes. */
@ApiTags('instructor-content')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('INSTRUCTOR', 'ADMIN')
@Controller('instructor/tests')
export class CopyController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CohortAccessService,
    private readonly tests: InstructorTestsService,
    private readonly copy: CopyService,
  ) {}

  /** Target must be mine and unlocked (R-4). */
  private async target(user: JwtPayload, testId: number) {
    const test = await this.access.assertTest(user, testId);
    await this.tests.assertContentEditable(testId);
    return test;
  }

  @ApiOperation({ summary: 'Append all questions or problems of a bank test to my test' })
  @ApiResponse({ status: 400, description: 'Different test type, or the same test' })
  @ApiResponse({ status: 403, description: 'Target test is not in your cohorts' })
  @ApiResponse({ status: 404, description: 'Source test not found' })
  @ApiResponse({ status: 409, description: 'Target test is locked (R-4)' })
  @HttpCode(200)
  @Post(':testId/copy-from')
  async copyTest(@Param() p: TestIdParamDto, @Body() dto: CopyTestDto, @CurrentUser() user: JwtPayload) {
    const target = await this.target(user, p.testId);
    const source = await this.prisma.test.findUnique({ where: { id: dto.sourceTestId } });
    if (!source) throw new NotFoundException('Test not found.');
    if (source.id === target.id) throw new BadRequestException('A test cannot be copied into itself.');
    if (source.type !== target.type) throw new BadRequestException(MSG_TYPE);
    await this.prisma.$transaction((tx) => this.copy.copyTestContent(tx, source.id, target.id));
    return this.tests.findOne(target.id);
  }

  @ApiOperation({ summary: 'Copy one MCQ question into my MCQ test' })
  @Post(':testId/questions/copy')
  async copyQuestion(@Param() p: TestIdParamDto, @Body() dto: CopyQuestionDto, @CurrentUser() user: JwtPayload) {
    const target = await this.target(user, p.testId);
    if (target.type !== 'MCQ') throw new BadRequestException(MSG_TYPE);
    const q = await this.prisma.$transaction((tx) => this.copy.copyQuestion(tx, dto.sourceQuestionId, target.id));
    return toInstructorQuestion(q);
  }

  @ApiOperation({ summary: 'Copy one coding problem into my coding test' })
  @Post(':testId/problems/copy')
  async copyProblem(@Param() p: TestIdParamDto, @Body() dto: CopyProblemDto, @CurrentUser() user: JwtPayload) {
    const target = await this.target(user, p.testId);
    if (target.type !== 'CODING') throw new BadRequestException(MSG_TYPE);
    const pr = await this.prisma.$transaction((tx) => this.copy.copyProblem(tx, dto.sourceProblemId, target.id));
    return toInstructorProblem(pr);
  }
}
