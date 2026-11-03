import { Option, Problem, Question, Test, TestCase } from '@prisma/client';

export const toInstructorQuestion = (q: Question & { options: Option[] }) => ({
  id: q.id,
  text: q.text,
  options: q.options.map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
});

export const toInstructorProblem = (p: Problem & { testCases: TestCase[] }) => ({
  id: p.id,
  title: p.title,
  description: p.description,
  functionName: p.functionName,
  points: p.points,
  testCases: p.testCases.map((c) => ({ id: c.id, visibility: c.visibility, args: c.args, expected: c.expected })),
});

export const toInstructorTestSummary = (
  t: Test,
  counts: { questionCount: number; problemCount: number; attemptCount: number; inProgressCount: number },
) => ({
  id: t.id,
  title: t.title,
  type: t.type,
  order: t.order,
  durationMinutes: t.durationMinutes,
  status: t.status,
  ...counts,
  isContentLocked: counts.attemptCount > 0,
});
