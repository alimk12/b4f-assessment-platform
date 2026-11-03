const key = (attemptId: number) => `b4f.attemptSession.${attemptId}`;
export function saveAttemptSession(attemptId: number, sessionKey: string) {
  try { sessionStorage.setItem(key(attemptId), sessionKey); } catch { /* ignore */ }
}
export function getAttemptSession(attemptId: number): string | null {
  try { return sessionStorage.getItem(key(attemptId)); } catch { return null; }
}
