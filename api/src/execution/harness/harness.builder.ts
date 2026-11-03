export const RESULT_MARKER = '__B4F_RESULT__';
const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/**
 * Student code FIRST (so error line numbers are the student's own), then the harness.
 * The harness receives only the arguments of each case, never the expected outputs.
 */
export function buildProgram(code: string, functionName: string, cases: unknown[][]): string {
  if (!IDENTIFIER.test(functionName)) throw new Error('Invalid function name');
  const fn = functionName;
  return `${code}
;(function __b4fHarness() {
  const __cases = ${JSON.stringify(cases)};
  const __logs = [];
  const __origLog = console.log;
  const __origError = console.error;
  console.log = (...a) => __logs.push(a.map(String).join(' '));
  console.error = console.log;
  const __out = { found: typeof ${fn} === 'function', results: [] };
  if (__out.found) {
    for (const args of __cases) {
      try {
        const value = ${fn}(...args);
        const t = typeof value;
        if (t === 'function' || t === 'symbol' || t === 'bigint') throw { __uncomparable: true };
        if (value !== undefined) JSON.stringify(value);
        __out.results.push({ ok: true, value: value === undefined ? { __undefined: true } : value });
      } catch (e) {
        if (e && e.__uncomparable || (e && e.name === 'TypeError' && /circular/i.test(e.message))) {
          __out.results.push({ ok: false, error: { type: 'UncomparableValue', message: '', stack: '' } });
        } else {
          __out.results.push({ ok: false, error: { type: e && e.name ? e.name : 'Error', message: e && e.message !== undefined ? String(e.message) : String(e), stack: e && e.stack ? String(e.stack) : '' } });
        }
      }
    }
  }
  __out.logs = __logs.slice(0, 50);
  console.log = __origLog;
  console.error = __origError;
  __origLog('${RESULT_MARKER}' + JSON.stringify(__out));
})();
`;
}
