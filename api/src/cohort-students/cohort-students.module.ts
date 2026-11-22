import { Module } from '@nestjs/common';
import { CohortStudentsController } from './cohort-students.controller';
import { CohortStudentsService } from './cohort-students.service';

@Module({
  controllers: [CohortStudentsController],
  providers: [CohortStudentsService],
})
export class CohortStudentsModule {}
