import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CohortIdParamDto } from '../common/dto/cohort-query.dto';
import { AdminService } from './admin.service';
import { CohortInstructorParamDto, CohortsQueryDto, CreateCohortDto } from './dto/admin.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/cohorts')
export class CohortsController {
  constructor(private readonly admin: AdminService) {}

  @ApiOperation({ summary: 'Cohorts, newest first (paginated)' })
  @Get()
  list(@Query() q: CohortsQueryDto) {
    return this.admin.listCohorts(q);
  }

  @ApiOperation({ summary: 'Create a cohort with its three DRAFT tests, optionally copied from another cohort' })
  @ApiResponse({ status: 404, description: 'City or source cohort not found' })
  @ApiResponse({ status: 409, description: 'The city already has a cohort with this name' })
  @Post()
  create(@Body() dto: CreateCohortDto) {
    return this.admin.createCohort(dto);
  }

  @ApiOperation({ summary: 'Archive a cohort (hidden from its students, results kept)' })
  @ApiResponse({ status: 409, description: 'Already archived, or a student is taking a test' })
  @Patch(':cohortId/archive')
  archive(@Param() p: CohortIdParamDto) {
    return this.admin.archiveCohort(p.cohortId);
  }

  @ApiOperation({ summary: 'Make a new join code (the old one stops working)' })
  @HttpCode(200)
  @Post(':cohortId/join-code')
  newJoinCode(@Param() p: CohortIdParamDto) {
    return this.admin.regenerateJoinCode(p.cohortId);
  }

  @ApiOperation({ summary: 'Link an instructor to a cohort' })
  @ApiResponse({ status: 409, description: 'Already linked' })
  @Post(':cohortId/instructors/:userId')
  link(@Param() p: CohortInstructorParamDto) {
    return this.admin.linkInstructor(p.cohortId, p.userId);
  }

  @ApiOperation({ summary: 'Unlink an instructor from a cohort' })
  @ApiResponse({ status: 404, description: 'Not linked' })
  @Delete(':cohortId/instructors/:userId')
  unlink(@Param() p: CohortInstructorParamDto) {
    return this.admin.unlinkInstructor(p.cohortId, p.userId);
  }
}
