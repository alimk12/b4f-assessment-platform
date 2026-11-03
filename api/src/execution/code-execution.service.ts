import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { normalizeHarnessError, normalizeStderr } from './error-normalizer';
import {
  ExecutionMode,
  ExecutionRunOutcome,
  ExecutionSubmitOutcome,
  ExecutionUnavailableError,
  ProblemForExecution,
  ProviderRawResult,
  RunStatus,
} from './execution.types';
import { buildProgram } from './harness/harness.builder';
import { parseHarnessResult } from './harness/harness-result.parser';
import { isEqual } from './output-comparer';
import { Judge0ExecutionProvider } from './providers/judge0.provider';
import { MockExecutionProvider } from './providers/mock.provider';

export const MSG_RUN_UNAVAILABLE =
  'The code execution service is not reachable right now. Your run was not counted. Please try again.';
export const MSG_SUBMIT_UNAVAILABLE =
  'The code execution service is not reachable right now. Your submission was not saved. Please try again.';

const MESSAGES: Record<Exclude<RunStatus, 'FUNCTION_NOT_FOUND' | 'MOCK'>, string> = {
  PASSED: 'Your function returned the expected output.',
  WRONG_ANSWER: 'Your function returned a different value than expected.',
  SYNTAX_ERROR: 'Your code has a syntax error.',
  RUNTIME_ERROR: 'Your code threw an error while running.',
  TIME_LIMIT_EXCEEDED: 'Your code took too long. Check for an infinite loop.',
};
const UNCOMPARABLE = 'Your function returned a value that cannot be compared (for example a function or a circular object).';

/** The ONLY place in the backend that handles student code (R-22). Never runs it locally. */
@Injectable()
export class CodeExecutionService {
  private readonly logger = new Logger(CodeExecutionService.name);
  private readonly mode: ExecutionMode;

  constructor(
    config: ConfigService,
    private readonly mock: MockExecutionProvider,
    private readonly judge0: Judge0ExecutionProvider,
  ) {
    this.mode = (config.get<string>('EXECUTION_MODE') ?? 'mock').toLowerCase() === 'judge0' ? 'JUDGE0' : 'MOCK';
    this.logger.log(`Execution mode: ${this.mode}`);
  }

  getMode(): ExecutionMode {
    return this.mode;
  }

  async run(problem: ProblemForExecution, code: string): Promise<ExecutionRunOutcome> {
    const sample = problem.testCases.find((c) => c.visibility === 'SAMPLE');
    const input = (sample?.args ?? []) as unknown[];
    const expected = sample?.expected ?? null;
    if (this.mode === 'MOCK') return this.mock.run(code, input, expected);

    const raw = await this.execute(code, problem.functionName, [input], MSG_RUN_UNAVAILABLE);
    const lines = code.split('\n').length;
    const base = { mode: this.mode, input, expectedOutput: expected, timeMs: raw.timeMs };
    const status = (s: RunStatus, error: ExecutionRunOutcome['error'] = null, actual: unknown = null, logs: string[] = []) => ({
      ...base,
      status: s,
      message:
        s === 'FUNCTION_NOT_FOUND'
          ? `No function named ${problem.functionName} was found. Declare it like this: function ${problem.functionName}(...) { }`
          : MESSAGES[s as keyof typeof MESSAGES],
      error,
      actualOutput: actual,
      logs,
    });

    if (raw.statusId === 5) return status('TIME_LIMIT_EXCEEDED');
    const parsed = parseHarnessResult(raw.stdout);
    if (!parsed) {
      const err = normalizeStderr(raw.compileOutput || raw.stderr, lines);
      return status(err.type === 'SyntaxError' || raw.statusId === 6 ? 'SYNTAX_ERROR' : 'RUNTIME_ERROR', err);
    }
    if (!parsed.found) return status('FUNCTION_NOT_FOUND', null, null, parsed.logs);
    const r = parsed.results[0];
    if (!r?.ok) {
      const err =
        r?.error?.type === 'UncomparableValue'
          ? { type: 'UncomparableValue', message: UNCOMPARABLE, line: null }
          : normalizeHarnessError(r?.error ?? { type: 'Error', message: '', stack: '' }, lines);
      return status('RUNTIME_ERROR', err, null, parsed.logs);
    }
    const actual = (r.value as { __undefined?: boolean })?.__undefined ? null : r.value;
    return status(isEqual(r.value, expected) ? 'PASSED' : 'WRONG_ANSWER', null, actual, parsed.logs);
  }

  async submit(problem: ProblemForExecution, code: string): Promise<ExecutionSubmitOutcome> {
    const hidden = problem.testCases.filter((c) => c.visibility === 'HIDDEN');
    if (this.mode === 'MOCK') return this.mock.submit(code, problem.functionName, hidden.length);

    const raw = await this.execute(code, problem.functionName, hidden.map((c) => c.args as unknown[]), MSG_SUBMIT_UNAVAILABLE);
    const parsed = raw.statusId === 5 ? null : parseHarnessResult(raw.stdout);
    let passedCount = 0;
    if (parsed?.found) {
      hidden.forEach((c, i) => {
        const r = parsed.results[i];
        if (r?.ok && isEqual(r.value, c.expected)) passedCount++;
      });
    }
    return { mode: this.mode, passedCount, totalCount: hidden.length };
  }

  private async execute(code: string, functionName: string, cases: unknown[][], unavailable: string): Promise<ProviderRawResult> {
    try {
      return await this.judge0.execute(buildProgram(code, functionName, cases));
    } catch (e) {
      if (e instanceof ExecutionUnavailableError) throw new ServiceUnavailableException(unavailable);
      throw e;
    }
  }
}
