import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminService } from './admin.service';
import { CreateCityDto } from './dto/admin.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/cities')
export class CitiesController {
  constructor(private readonly admin: AdminService) {}

  @ApiOperation({ summary: 'Every city with its number of cohorts' })
  @Get()
  list() {
    return this.admin.listCities();
  }

  @ApiOperation({ summary: 'Create a city' })
  @ApiResponse({ status: 409, description: 'A city with this name already exists' })
  @Post()
  create(@Body() dto: CreateCityDto) {
    return this.admin.createCity(dto);
  }
}
