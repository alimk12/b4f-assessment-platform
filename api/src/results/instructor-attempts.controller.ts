import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { CohortAccessService } from '../common/cohort-access.service';
import { AttemptIdParamDto } from '../common/dto/id-param.dto';
import { AttemptsQueryDto } from './dto/attempts-query.dto';
import { ResultsService } from './results.service';

@ApiTags('instructor-attempts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('INSTRUCTOR', 'ADMIN')
@Controller('instructor/attempts')
export class InstructorAttemptsController {
  constructor(private readonly results: ResultsService, private readonly access: CohortAccessService) {}

  @ApiOperation({ summary: 'Attempts of one cohort, filtered by test and status, searched by student name' })
  @ApiResponse({ status: 403, description: 'Not one of your cohorts' })
  @Get()
  async getAttempts(@Query() q: AttemptsQueryDto, @CurrentUser() user: JwtPayload) {
    await this.access.assertCohort(user, q.cohortId);
    return this.results.listAttempts(q);
  }

  @ApiOperation({ summary: 'One attempt with its result details, violation summary and violation log' })
  @ApiResponse({ status: 403, description: 'Not one of your cohorts' })
  @ApiResponse({ status: 404, description: 'Attempt not found' })
  @Get(':attemptId')
  async getAttempt(@Param() p: AttemptIdParamDto, @CurrentUser() user: JwtPayload) {
    await this.access.assertAttempt(user, p.attemptId);
    return this.results.getAttemptDetail(p.attemptId);
  }
}
