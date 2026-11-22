import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { CohortAccessService } from '../common/cohort-access.service';
import { AdminService } from './admin.service';

@ApiTags('instructor-cohorts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('INSTRUCTOR', 'ADMIN')
@Controller('instructor/cohorts')
export class InstructorCohortsController {
  constructor(private readonly admin: AdminService, private readonly access: CohortAccessService) {}

  @ApiOperation({ summary: 'My cohorts with their join codes, active first (every cohort for ADMIN)' })
  @Get()
  async myCohorts(@CurrentUser() user: JwtPayload) {
    return this.admin.cohortsFor(await this.access.listCohortIds(user));
  }
}
