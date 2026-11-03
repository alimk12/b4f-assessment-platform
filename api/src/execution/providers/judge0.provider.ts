import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExecutionUnavailableError, ProviderRawResult } from '../execution.types';
import { ExecutionProvider } from './execution-provider.interface';

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64');
const unb64 = (s?: string | null) => (s ? Buffer.from(s, 'base64').toString('utf8') : '');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Sends one program to an external Judge0 instance. Expected outputs are never sent. */
@Injectable()
export class Judge0ExecutionProvider implements ExecutionProvider {
  readonly mode = 'JUDGE0' as const;
  private readonly logger = new Logger(Judge0ExecutionProvider.name);

  constructor(private readonly config: ConfigService) {}

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    const name = this.config.get<string>('JUDGE0_AUTH_HEADER');
    const token = this.config.get<string>('JUDGE0_AUTH_TOKEN');
    if (name && token) h[name] = token;
    return h;
  }

  async execute(sourceCode: string): Promise<ProviderRawResult> {
    const base = (this.config.get<string>('JUDGE0_URL') ?? '').replace(/\/$/, '');
    const languageId = Number(this.config.get<string>('JUDGE0_LANGUAGE_ID'));
    const timeoutMs = Number(this.config.get<string>('EXECUTION_TIMEOUT_MS') ?? 10000);
    if (!base || !languageId) throw new ExecutionUnavailableError('JUDGE0_URL or JUDGE0_LANGUAGE_ID is not set');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const created = await fetch(`${base}/submissions?base64_encoded=true&wait=false`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ language_id: languageId, source_code: b64(sourceCode), cpu_time_limit: 2, wall_time_limit: 5 }),
        signal: controller.signal,
      });
      if (!created.ok) throw new ExecutionUnavailableError(`Judge0 HTTP ${created.status}`);
      const { token } = (await created.json()) as { token: string };
      const fields = 'stdout,stderr,compile_output,status,time';
      for (;;) {
        await sleep(500);
        const res = await fetch(`${base}/submissions/${token}?base64_encoded=true&fields=${fields}`, {
          headers: this.headers(),
          signal: controller.signal,
        });
        if (!res.ok) throw new ExecutionUnavailableError(`Judge0 HTTP ${res.status}`);
        const body = (await res.json()) as {
          status: { id: number };
          stdout?: string;
          stderr?: string;
          compile_output?: string;
          time?: string;
        };
        if (body.status.id === 1 || body.status.id === 2) continue;
        if (body.status.id === 13 || body.status.id === 14) throw new ExecutionUnavailableError(`Judge0 status ${body.status.id}`);
        return {
          statusId: body.status.id,
          stdout: unb64(body.stdout),
          stderr: unb64(body.stderr),
          compileOutput: unb64(body.compile_output),
          timeMs: body.time ? Math.round(Number(body.time) * 1000) : null,
        };
      }
    } catch (e) {
      const reason = (e as Error).name === 'AbortError' ? 'timeout' : (e as Error).message;
      this.logger.error(`Execution provider failed: ${reason}`);
      throw e instanceof ExecutionUnavailableError ? e : new ExecutionUnavailableError(reason);
    } finally {
      clearTimeout(timer);
    }
  }
}
