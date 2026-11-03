import { RESULT_MARKER } from './harness.builder';

export interface HarnessCaseResult {
  ok: boolean;
  value?: unknown;
  error?: { type: string; message: string; stack: string };
}
export interface HarnessResult {
  found: boolean;
  results: HarnessCaseResult[];
  logs: string[];
}

/** The LAST line that starts with the marker is ours; the student's own output can never fake it after us. */
export function parseHarnessResult(stdout: string): HarnessResult | null {
  const lines = stdout.split('\n').filter((l) => l.startsWith(RESULT_MARKER));
  const last = lines.at(-1);
  if (!last) return null;
  try {
    return JSON.parse(last.slice(RESULT_MARKER.length)) as HarnessResult;
  } catch {
    return null;
  }
}
