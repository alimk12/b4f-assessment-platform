import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { TestIdParamDto } from '../common/dto/id-param.dto';
import { BankService } from './bank.service';
import { BankQueryDto } from './dto/bank-query.dto';

@ApiTags('instructor-bank')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('INSTRUCTOR', 'ADMIN')
@Controller('instructor/bank/tests')
export class BankController {
  constructor(private readonly bank: BankService) {}

  @ApiOperation({ summary: 'Every test of every cohort and city, read-only (paginated)' })
  @Get()
  list(@Query() q: BankQueryDto, @CurrentUser() user: JwtPayload) {
    return this.bank.list(user, q);
  }

  @ApiOperation({ summary: 'One bank test with its full content (correct options and every test case)' })
  @ApiResponse({ status: 404, description: 'Test not found' })
  @Get(':testId')
  get(@Param() p: TestIdParamDto, @CurrentUser() user: JwtPayload) {
    return this.bank.getDetail(user, p.testId);
  }
}
