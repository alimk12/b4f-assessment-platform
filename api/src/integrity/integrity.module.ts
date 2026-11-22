import { Module } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module';
import { AttemptStateModule } from '../attempt-state/attempt-state.module';
import { AttemptSessionGuard } from './guards/attempt-session.guard';
import { IntegrityController } from './integrity.controller';
import { IntegrityService } from './integrity.service';

@Module({
  imports: [AttemptStateModule, AlertsModule],
  controllers: [IntegrityController],
  providers: [IntegrityService, AttemptSessionGuard],
  exports: [IntegrityService, AttemptSessionGuard],
})
export class IntegrityModule {}
