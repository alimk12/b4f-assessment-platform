import { randomInt } from 'crypto';

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Fisher–Yates with crypto.randomInt; stored on the attempt so every read uses the same order. */
export function buildAttemptOrder(questions: { id: number; options: { id: number }[] }[]) {
  const questionOrder = shuffle(questions.map((q) => q.id));
  const optionOrder: Record<string, number[]> = {};
  for (const q of questions) optionOrder[String(q.id)] = shuffle(q.options.map((o) => o.id));
  return { questionOrder, optionOrder };
}

function applyOrder<T extends { id: number }>(items: T[], order: number[] | undefined | null): T[] {
  if (!order?.length) return items;
  const rank = new Map(order.map((id, i) => [id, i]));
  return [...items].sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity));
}

export const applyQuestionOrder = <T extends { id: number }>(questions: T[], order: number[] | null | undefined) =>
  applyOrder(questions, order);
export const applyOptionOrder = <T extends { id: number }>(options: T[], order: number[] | null | undefined) =>
  applyOrder(options, order);
