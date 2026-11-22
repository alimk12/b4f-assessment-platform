import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { CohortIdParamDto, UserIdParamDto } from '../common/dto/cohort-query.dto';
import { CohortStudentsService } from './cohort-students.service';
import { CreateStudentDto, ResetPasswordDto, StudentsQueryDto, UpdateStudentDto } from './dto/cohort-students.dto';

@ApiTags('instructor-students')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('INSTRUCTOR', 'ADMIN')
@Controller('instructor')
export class CohortStudentsController {
  constructor(private readonly students: CohortStudentsService) {}

  @ApiOperation({ summary: 'Students of one of my cohorts (paginated, by name)' })
  @ApiResponse({ status: 403, description: 'Not one of your cohorts' })
  @Get('cohorts/:cohortId/students')
  list(@Param() p: CohortIdParamDto, @Query() q: StudentsQueryDto, @CurrentUser() user: JwtPayload) {
    return this.students.list(user, p.cohortId, q);
  }

  @ApiOperation({ summary: 'Create a student account in one of my cohorts' })
  @ApiResponse({ status: 409, description: 'Email already used, or the cohort is archived' })
  @Post('cohorts/:cohortId/students')
  create(@Param() p: CohortIdParamDto, @Body() dto: CreateStudentDto, @CurrentUser() user: JwtPayload) {
    return this.students.create(user, p.cohortId, dto);
  }

  @ApiOperation({ summary: 'Edit name / email, or enable / disable a student (disabling ends every session)' })
  @ApiResponse({ status: 404, description: 'Student not found (or not in your cohorts)' })
  @Patch('students/:userId')
  update(@Param() p: UserIdParamDto, @Body() dto: UpdateStudentDto, @CurrentUser() user: JwtPayload) {
    return this.students.update(user, p.userId, dto);
  }

  @ApiOperation({ summary: 'Set a new password (ends every session of the student)' })
  @HttpCode(204)
  @Post('students/:userId/reset-password')
  async resetPassword(@Param() p: UserIdParamDto, @Body() dto: ResetPasswordDto, @CurrentUser() user: JwtPayload) {
    await this.students.resetPassword(user, p.userId, dto);
  }

  @ApiOperation({ summary: 'Sign the student out of every device' })
  @HttpCode(204)
  @Post('students/:userId/sign-out')
  async signOut(@Param() p: UserIdParamDto, @CurrentUser() user: JwtPayload) {
    await this.students.signOut(user, p.userId);
  }
}
