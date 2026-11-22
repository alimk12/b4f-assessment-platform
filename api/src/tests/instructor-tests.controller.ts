import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { CohortAccessService } from '../common/cohort-access.service';
import { CohortQueryDto } from '../common/dto/cohort-query.dto';
import { TestIdParamDto } from '../common/dto/id-param.dto';
import { InstructorTestsService } from './instructor-tests.service';

@ApiTags('instructor-tests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('INSTRUCTOR', 'ADMIN')
@Controller('instructor/tests')
export class InstructorTestsController {
  constructor(private readonly tests: InstructorTestsService, private readonly access: CohortAccessService) {}

  @ApiOperation({ summary: 'The three tests of one cohort with their counts' })
  @ApiResponse({ status: 403, description: 'Not one of your cohorts' })
  @Get()
  async getTests(@Query() q: CohortQueryDto, @CurrentUser() user: JwtPayload) {
    await this.access.assertCohort(user, q.cohortId);
    return this.tests.findAll(q.cohortId);
  }

  @ApiOperation({ summary: 'One test with its questions or problems (with correct options and hidden cases)' })
  @Get(':testId')
  async getTest(@Param() p: TestIdParamDto, @CurrentUser() user: JwtPayload) {
    await this.access.assertTest(user, p.testId);
    return this.tests.findOne(p.testId);
  }

  @ApiOperation({ summary: 'Publish a test (MCQ needs 5+ questions, coding needs 1+ problem)' })
  @Patch(':testId/publish')
  async publish(@Param() p: TestIdParamDto, @CurrentUser() user: JwtPayload) {
    await this.access.assertTest(user, p.testId);
    return this.tests.publish(p.testId);
  }

  @ApiOperation({ summary: 'Unpublish a test (rejected while an attempt is in progress)' })
  @Patch(':testId/unpublish')
  async unpublish(@Param() p: TestIdParamDto, @CurrentUser() user: JwtPayload) {
    await this.access.assertTest(user, p.testId);
    return this.tests.unpublish(p.testId);
  }
}
