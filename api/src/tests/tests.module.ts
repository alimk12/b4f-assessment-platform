import { Module } from '@nestjs/common';
import { AttemptStateModule } from '../attempt-state/attempt-state.module';
import { CopyController } from './copy.controller';
import { CopyService } from './copy.service';
import { InstructorTestsController } from './instructor-tests.controller';
import { InstructorTestsService } from './instructor-tests.service';
import { ProblemsController } from './problems.controller';
import { ProblemsService } from './problems.service';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';

@Module({
  imports: [AttemptStateModule],
  controllers: [InstructorTestsController, QuestionsController, ProblemsController, CopyController],
  providers: [InstructorTestsService, QuestionsService, ProblemsService, CopyService],
  exports: [InstructorTestsService, CopyService],
})
export class TestsModule {}
