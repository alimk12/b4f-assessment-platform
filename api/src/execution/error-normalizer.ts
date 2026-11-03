import { ExecutionError } from './execution.types';

const MAX_MESSAGE = 300;

/** The first `file.js:<line>` in a stack or stderr; a line inside our harness is dropped. */
export function extractLine(text: string, studentLines: number): number | null {
  const m = /\.js:(\d+)/.exec(text);
  if (!m) return null;
  const line = Number(m[1]);
  return line >= 1 && line <= studentLines ? line : null;
}

export function cleanMessage(message: string): string {
  return message
    .replace(/\(?(?:\/[\w.-]+)+\.js(?::\d+)*\)?/g, '')
    .replace(/node:internal[^\s)]*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_MESSAGE);
}

/** A thrown error reported by the harness. */
export function normalizeHarnessError(err: { type: string; message: string; stack: string }, studentLines: number): ExecutionError {
  return {
    type: err.type || 'Error',
    message: cleanMessage(err.message ?? ''),
    line: extractLine(err.stack ?? '', studentLines),
  };
}

/** No result line: the program crashed before or outside the harness (usually a syntax error). */
export function normalizeStderr(stderr: string, studentLines: number): ExecutionError {
  const m = /^\s*(\w*Error): (.+)$/m.exec(stderr);
  const firstLine = stderr.split('\n').find((l) => l.trim().length > 0) ?? '';
  return {
    type: m ? m[1] : 'Error',
    message: cleanMessage(m ? m[2] : firstLine),
    line: extractLine(stderr, studentLines),
  };
}
