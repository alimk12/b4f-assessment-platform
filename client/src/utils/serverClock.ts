export const getOffsetMs = (serverNow: string) => Date.parse(serverNow) - Date.now();
export const getRemainingMs = (deadline: string, offsetMs: number) => Math.max(0, Date.parse(deadline) - (Date.now() + offsetMs));
export function formatRemaining(ms: number) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
