import { MAX_RUNS_PER_PROBLEM } from '../../common/constants';
import { applyOptionOrder, applyQuestionOrder } from '../../tests/attempt-order.util';

/** The ONLY place that builds student attempt shapes: never isCorrect, never HIDDEN test cases. */
export function toStudentQuestions(
  questions: { id: number; text: string; options: { id: number; text: string }[] }[],
  questionOrder: number[] | null,
  optionOrder: Record<string, number[]> | null,
  saved: Map<number, number | null>,
) {
  return applyQuestionOrder(questions, questionOrder).map((q) => ({
    id: q.id,
    text: q.text,
    options: applyOptionOrder(q.options, optionOrder?.[String(q.id)]).map((o) => ({ id: o.id, text: o.text })),
    selectedOptionId: saved.get(q.id) ?? null,
  }));
}

export function toStudentProblem(
  p: {
    id: number;
    title: string;
    description: string;
    functionName: string;
    points: number;
    testCases: { args: unknown; expected: unknown }[];
  },
  r: { runCount: number; passedCount: number | null; totalCount: number | null; points: number | null; submittedAt: Date | null } | undefined,
) {
  const sample = p.testCases[0];
  const runCount = r?.runCount ?? 0;
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    functionName: p.functionName,
    points: p.points,
    sample: sample ? { args: sample.args, expected: sample.expected } : null,
    runCount,
    runsRemaining: Math.max(0, MAX_RUNS_PER_PROBLEM - runCount),
    submission: r?.submittedAt
      ? { passedCount: r.passedCount, totalCount: r.totalCount, points: r.points, submittedAt: r.submittedAt }
      : null,
  };
}
