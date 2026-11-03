import { Module } from '@nestjs/common';
import { CodeExecutionService } from './code-execution.service';
import { Judge0ExecutionProvider } from './providers/judge0.provider';
import { MockExecutionProvider } from './providers/mock.provider';

@Module({
  providers: [CodeExecutionService, MockExecutionProvider, Judge0ExecutionProvider],
  exports: [CodeExecutionService],
})
export class ExecutionModule {}
