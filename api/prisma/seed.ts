import 'dotenv/config';
import { CohortStatus, PrismaClient, TestStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CODING_PROBLEMS } from './seed-data/coding-problems';
import { HTML_CSS_QUESTIONS, IQ_QUESTIONS } from './seed-data/mcq-questions';
import { SEED_USERS } from './seed-data/users';

const prisma = new PrismaClient();

const TESTS = [
  { order: 1, title: 'IQ Test', type: 'MCQ' as const, durationMinutes: 20, questions: IQ_QUESTIONS },
  { order: 2, title: 'HTML & CSS Test', type: 'MCQ' as const, durationMinutes: 20, questions: HTML_CSS_QUESTIONS },
  { order: 3, title: 'JavaScript Problem Solving', type: 'CODING' as const, durationMinutes: 45, questions: [] },
];

// Fixed join codes for local development only (docs/PROJECT-STRUCTURE.md §17.3).
const SEED_COHORTS: Record<
  string,
  { city: string; name: string; joinCode: string; status: CohortStatus; testStatus: [TestStatus, TestStatus, TestStatus] }
> = {
  'salamiyah-8': { city: 'Salamiyah', name: 'Cohort 8', joinCode: 'SALAM8XX', status: 'ARCHIVED', testStatus: ['PUBLISHED', 'PUBLISHED', 'PUBLISHED'] },
  'salamiyah-9': { city: 'Salamiyah', name: 'Cohort 9', joinCode: 'SALAM9XX', status: 'ACTIVE', testStatus: ['PUBLISHED', 'PUBLISHED', 'DRAFT'] },
  'homs-3': { city: 'Homs', name: 'Cohort 3', joinCode: 'HMS3XXXX', status: 'ACTIVE', testStatus: ['DRAFT', 'DRAFT', 'DRAFT'] },
};

async function seedTests(cohortId: number, statuses: TestStatus[], sourceCohortId?: number) {
  for (const [i, t] of TESTS.entries()) {
    const source = sourceCohortId
      ? await prisma.test.findUnique({ where: { cohortId_order: { cohortId: sourceCohortId, order: t.order } } })
      : null;
    const test = await prisma.test.upsert({
      where: { cohortId_order: { cohortId, order: t.order } },
      update: {},
      create: {
        cohortId,
        order: t.order,
        title: t.title,
        type: t.type,
        durationMinutes: t.durationMinutes,
        status: statuses[i],
        sourceTestId: source?.id ?? null,
      },
    });
    if (t.type === 'MCQ' && (await prisma.question.count({ where: { testId: test.id } })) === 0) {
      for (const [qi, q] of t.questions.entries()) {
        await prisma.question.create({
          data: {
            testId: test.id,
            text: q.text,
            position: qi,
            options: { create: q.options.map((text, j) => ({ text, isCorrect: j === q.correct, position: j })) },
          },
        });
      }
    }
    if (t.type === 'CODING' && (await prisma.problem.count({ where: { testId: test.id } })) === 0) {
      for (const [pi, p] of CODING_PROBLEMS.entries()) {
        await prisma.problem.create({
          data: {
            testId: test.id,
            title: p.title,
            description: p.description,
            functionName: p.functionName,
            points: p.points,
            position: pi,
            testCases: {
              create: p.testCases.map((c, j) => ({ visibility: c.visibility, args: c.args as never, expected: c.expected as never, position: j })),
            },
          },
        });
      }
    }
  }
}

async function main() {
  // Cities and cohorts
  const cohortIds: Record<string, number> = {};
  for (const [key, c] of Object.entries(SEED_COHORTS)) {
    const city = await prisma.city.upsert({ where: { name: c.city }, update: {}, create: { name: c.city } });
    const cohort = await prisma.cohort.upsert({
      where: { cityId_name: { cityId: city.id, name: c.name } },
      update: {},
      create: {
        cityId: city.id,
        name: c.name,
        joinCode: c.joinCode,
        status: c.status,
        archivedAt: c.status === 'ARCHIVED' ? new Date() : null,
      },
    });
    cohortIds[key] = cohort.id;
  }

  // Tests: Salamiyah 8 and 9 have their own content; Homs 3 starts as a copy of Salamiyah 9 (A-2).
  await seedTests(cohortIds['salamiyah-8'], SEED_COHORTS['salamiyah-8'].testStatus);
  await seedTests(cohortIds['salamiyah-9'], SEED_COHORTS['salamiyah-9'].testStatus);
  await seedTests(cohortIds['homs-3'], SEED_COHORTS['homs-3'].testStatus, cohortIds['salamiyah-9']);

  // Users
  for (const u of SEED_USERS) {
    const cohortId = u.cohort ? cohortIds[u.cohort] : null;
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { fullName: u.fullName, email: u.email, role: u.role, cohortId, passwordHash: await bcrypt.hash(u.password, 10) },
    });
    for (const key of u.cohorts ?? []) {
      const cid = cohortIds[key];
      await prisma.cohortInstructor.upsert({
        where: { cohortId_userId: { cohortId: cid, userId: user.id } },
        update: {},
        create: { cohortId: cid, userId: user.id },
      });
    }
  }
  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
