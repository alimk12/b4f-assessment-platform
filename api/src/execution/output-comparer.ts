const isUndefinedMarker = (v: unknown) =>
  typeof v === 'object' && v !== null && (v as { __undefined?: boolean }).__undefined === true && Object.keys(v).length === 1;

/** Compared on OUR backend, never by the execution service (API.md 13.5). */
export function isEqual(actual: unknown, expected: unknown): boolean {
  if (isUndefinedMarker(actual)) return expected === undefined;
  if (typeof actual === 'number' && typeof expected === 'number') {
    if (Number.isNaN(actual) && Number.isNaN(expected)) return true;
    return Math.abs(actual - expected) < 1e-9;
  }
  if (Array.isArray(actual) || Array.isArray(expected)) {
    if (!Array.isArray(actual) || !Array.isArray(expected) || actual.length !== expected.length) return false;
    return actual.every((v, i) => isEqual(v, expected[i]));
  }
  if (actual !== null && expected !== null && typeof actual === 'object' && typeof expected === 'object') {
    const a = actual as Record<string, unknown>;
    const b = expected as Record<string, unknown>;
    const ka = Object.keys(a).sort();
    const kb = Object.keys(b).sort();
    if (ka.length !== kb.length || ka.some((k, i) => k !== kb[i])) return false;
    return ka.every((k) => isEqual(a[k], b[k]));
  }
  return actual === expected;
}
