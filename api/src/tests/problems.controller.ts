import { Body, Controller, Delete, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { CohortAccessService } from '../common/cohort-access.service';
import { ProblemIdParamDto, TestIdParamDto } from '../common/dto/id-param.dto';
import { ProblemDto } from './dto/problem.dto';
import { ProblemsService } from './problems.service';

@ApiTags('instructor-content')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('INSTRUCTOR', 'ADMIN')
@Controller('instructor')
export class ProblemsController {
  constructor(private readonly problems: ProblemsService, private readonly access: CohortAccessService) {}

  @ApiOperation({ summary: 'Add a coding problem (1+ sample case, 3+ hidden cases)' })
  @Post('tests/:testId/problems')
  async createProblem(@Param() p: TestIdParamDto, @Body() dto: ProblemDto, @CurrentUser() user: JwtPayload) {
    await this.access.assertTest(user, p.testId);
    return this.problems.create(p.testId, dto);
  }

  @ApiOperation({ summary: 'Replace a coding problem and all its test cases' })
  @Put('problems/:problemId')
  async replaceProblem(@Param() p: ProblemIdParamDto, @Body() dto: ProblemDto, @CurrentUser() user: JwtPayload) {
    await this.access.assertProblem(user, p.problemId);
    return this.problems.replace(p.problemId, dto);
  }

  @ApiOperation({ summary: 'Delete a coding problem' })
  @Delete('problems/:problemId')
  async deleteProblem(@Param() p: ProblemIdParamDto, @CurrentUser() user: JwtPayload) {
    await this.access.assertProblem(user, p.problemId);
    return this.problems.remove(p.problemId);
  }
}
