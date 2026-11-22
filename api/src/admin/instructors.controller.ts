import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserIdParamDto } from '../common/dto/cohort-query.dto';
import { AdminService } from './admin.service';
import { CreateInstructorDto, InstructorsQueryDto, UpdateInstructorDto } from './dto/admin.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/instructors')
export class InstructorsController {
  constructor(private readonly admin: AdminService) {}

  @ApiOperation({ summary: 'Instructor accounts with their cohorts (paginated)' })
  @Get()
  list(@Query() q: InstructorsQueryDto) {
    return this.admin.listInstructors(q);
  }

  @ApiOperation({ summary: 'Create an instructor account, optionally linked to cohorts' })
  @ApiResponse({ status: 409, description: 'Email already used' })
  @Post()
  create(@Body() dto: CreateInstructorDto) {
    return this.admin.createInstructor(dto);
  }

  @ApiOperation({ summary: 'Edit the name or enable / disable an instructor (disabling ends every session)' })
  @ApiResponse({ status: 404, description: 'Instructor not found' })
  @Patch(':userId')
  update(@Param() p: UserIdParamDto, @Body() dto: UpdateInstructorDto) {
    return this.admin.updateInstructor(p.userId, dto);
  }
}
