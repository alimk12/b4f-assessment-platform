import { Module } from '@nestjs/common';
import { AttemptStateModule } from '../attempt-state/attempt-state.module';
import { TestsModule } from '../tests/tests.module';
import { AdminService } from './admin.service';
import { CitiesController } from './cities.controller';
import { CohortsController } from './cohorts.controller';
import { InstructorCohortsController } from './instructor-cohorts.controller';
import { InstructorsController } from './instructors.controller';

@Module({
  imports: [AttemptStateModule, TestsModule],
  controllers: [CitiesController, CohortsController, InstructorsController, InstructorCohortsController],
  providers: [AdminService],
})
export class AdminModule {}
