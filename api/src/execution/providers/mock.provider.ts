import { Injectable } from '@nestjs/common';
import { ExecutionRunOutcome, ExecutionSubmitOutcome } from '../execution.types';

/** R-23: never executes student code. */
@Injectable()
export class MockExecutionProvider {
  readonly mode = 'MOCK' as const;

  run(code: string, input: unknown[], expected: unknown): ExecutionRunOutcome {
    const empty = code.trim().length === 0;
    const lines = code.split('\n').length;
    return {
      mode: 'MOCK',
      status: empty ? 'SYNTAX_ERROR' : 'MOCK',
      message: empty ? 'Code cannot be empty.' : `[MOCK] Code received: ${lines} lines. Real execution is not enabled.`,
      input,
      expectedOutput: expected,
      actualOutput: null,
      logs: [],
      error: empty ? { type: 'Error', message: 'Code cannot be empty.', line: null } : null,
      timeMs: null,
    };
  }

  submit(code: string, functionName: string, totalCount: number): ExecutionSubmitOutcome {
    const declared = new RegExp(`function\\s+${functionName}\\s*\\(`).test(code);
    return { mode: 'MOCK', passedCount: declared ? totalCount : 0, totalCount };
  }
}
