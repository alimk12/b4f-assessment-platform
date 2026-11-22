import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { AlertsService } from './alerts.service';
import { AlertIdParamDto, AlertsQueryDto, CohortRequiredQueryDto, UnreadCountQueryDto } from './dto/alerts-query.dto';

@ApiTags('instructor-alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('INSTRUCTOR', 'ADMIN')
@Controller('instructor/alerts')
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @ApiOperation({ summary: 'Alerts of one cohort, newest first (paginated). Never deleted.' })
  @ApiResponse({ status: 403, description: 'Not one of your cohorts' })
  @Get()
  list(@Query() q: AlertsQueryDto, @CurrentUser() user: JwtPayload) {
    return this.alerts.list(user, q);
  }

  @ApiOperation({ summary: 'Unread alerts { count, dangerCount } (all my cohorts without cohortId)' })
  @Get('unread-count')
  unreadCount(@Query() q: UnreadCountQueryDto, @CurrentUser() user: JwtPayload) {
    return this.alerts.unreadCount(user, q.cohortId);
  }

  @ApiOperation({ summary: 'Mark every alert of a cohort as read' })
  @Patch('read-all')
  markAllRead(@Query() q: CohortRequiredQueryDto, @CurrentUser() user: JwtPayload) {
    return this.alerts.markAllRead(user, q.cohortId);
  }

  @ApiOperation({ summary: 'Mark one alert as read (shared by every instructor of the cohort)' })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  @Patch(':alertId/read')
  markRead(@Param() p: AlertIdParamDto, @CurrentUser() user: JwtPayload) {
    return this.alerts.markRead(user, p.alertId);
  }
}
