import { Global, Module } from '@nestjs/common';
import { ClockService } from './clock.service';
import { CohortAccessService } from './cohort-access.service';

@Global()
@Module({ providers: [ClockService, CohortAccessService], exports: [ClockService, CohortAccessService] })
export class CommonModule {}
