# B4F Assessment Platform

Weekly Mini Project 04 — Team 3, B4F Next/Nest Bootcamp (Cohort 8, Salamiyah).

An online assessment platform with three ordered tests: **IQ** (multiple choice), **HTML & CSS** (multiple choice) and **JavaScript Problem Solving** (coding with a real editor and real code execution). The instructor manages the tests and reviews every attempt; students take the tests in order, once each, under a server-side timer and exam-integrity rules.

| Part | Stack |
| --- | --- |
| `api/` | NestJS 10, Prisma 6 + PostgreSQL 16, JWT, class-validator, Swagger |
| `client/` | React 18 + TypeScript, Vite, React Router, Monaco editor (bundled, no CDN), plain CSS |
| `docs/` | `API.md` (the contract), `PROJECT-STRUCTURE.md`, `TASKS.md`, work packages (PDF) |
| `tools/` | Local test tooling: API flow test, expiry test, UI walkthrough, fake Judge0 |

Everything works **in Syria without a VPN**: no CDN, no Google Fonts, the browser talks only to our backend, and the backend talks to one outside host only (the code-execution service, in `judge0` mode).

---

## 1. Requirements

- Node.js 20+ (22 recommended)
- PostgreSQL 16 running locally
- If `npm install` is slow or blocked: `npm config set registry https://registry.npmmirror.com`

## 2. Run it

```bash
# 1) Backend
cd api
cp .env.example .env            # then edit DATABASE_URL and JWT_SECRET
npm install
npx prisma migrate deploy       # creates the tables
npx prisma db seed              # 3 tests, 24 questions, 2 problems, demo accounts
npm run start:dev               # http://localhost:3000/api   ·  Swagger: http://localhost:3000/api/docs

# 2) Frontend (new terminal)
cd client
cp .env.example .env            # VITE_API_URL=http://localhost:3000/api
npm install
npm run dev                     # http://localhost:5173
```

To start over with a clean database: `npx prisma migrate reset --force` (drops everything, migrates, seeds).

### Demo accounts (from the seed)

| Role | Email | Password |
| --- | --- | --- |
| Instructor | `instructor@b4f.local` | `Instructor123` |
| Student | `lina@b4f.local` | `Student123` |
| Student | `omar@b4f.local` | `Student123` |

New students can also sign up from the **Sign up** page. Instructor accounts come only from the seed.

The seed publishes the IQ and HTML & CSS tests. The coding test starts as **Draft** — publish it from **Tests** as the instructor.

## 3. Environment variables (`api/.env`)

| Variable | Meaning |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Token signing secret and lifetime (default `8h`) |
| `CLIENT_ORIGIN` | Allowed CORS origin (default `http://localhost:5173`) |
| `EXECUTION_MODE` | `mock` (default, always works) or `judge0` (real execution) |
| `JUDGE0_URL` | Base URL of a Judge0 CE instance (only in `judge0` mode) |
| `JUDGE0_AUTH_HEADER`, `JUDGE0_AUTH_TOKEN` | Optional auth header name and value for the Judge0 host |
| `JUDGE0_LANGUAGE_ID` | Id of the newest JavaScript (Node.js) from `GET <JUDGE0_URL>/languages` |
| `EXECUTION_TIMEOUT_MS` | Max wait for one execution (default `10000`) |

## 4. Code execution modes

- **`mock`** — code is not executed. Run answers `[MOCK] Code received: <n> lines…`, and the UI shows a yellow notice. Use it when no execution host is reachable. The demo never depends on luck: if the host is down on demo day, switch to `mock` and restart.
- **`judge0`** — the backend wraps the student's function in a harness (student code first, so line numbers match), sends only the arguments to Judge0, and compares the output **on our backend**. Expected outputs and hidden tests never leave the server. Errors come back readable: type, short message, and the student's own line number (see `docs/API.md` §13).

Before using a public Judge0 host, check from Syria **without a VPN** that `GET <JUDGE0_URL>/languages` answers. Self-hosting Judge0 CE with Docker on any server you control also works.

### Testing `judge0` mode locally without internet

`tools/fake-judge0/server.mjs` imitates the Judge0 HTTP API on port 2358 by running the code with your local Node.js. **Local testing only — it runs code without any sandbox; never expose it.**

```bash
node tools/fake-judge0/server.mjs
# in api/.env:  EXECUTION_MODE=judge0  JUDGE0_URL=http://127.0.0.1:2358  JUDGE0_LANGUAGE_ID=63
```

## 5. Exam integrity (what the student sees)

- The test runs in **full screen**. Leaving full screen or switching tab: 1st time a warning, 2nd time the exam ends.
- **Copy / cut / paste or drop from outside** the code editor: warnings on the 1st and 2nd time, the 3rd ends the exam. Copy and paste of the student's own code *inside* the editor works normally.
- A terminated attempt keeps the score of what was saved before termination and is labelled `Terminated — exam rules violated (X%)`.
- Also: a pledge before start, shuffled question/option order per student, one active window per attempt (`X-Attempt-Session`), and a violation log the instructor can review.
- All counting and decisions happen on the server. Browser checks deter; they cannot fully prevent (see `docs/PROJECT-STRUCTURE.md` §16.4).

## 6. Tests and tooling

With the API running (and the database freshly seeded):

```bash
node tools/e2e/api-flow.mjs          # full API flow: auth, roles, MCQ, integrity, coding, results
node tools/e2e/expiry.mjs            # server timer, grace period, EXPIRED state (needs psql)
node tools/e2e/ui-walkthrough.cjs ./shots   # browser walkthrough with Playwright (client on :5173)
```

## 7. Repository rules

- Read `docs/API.md` before changing any endpoint — it is the contract between frontend and backend.
- One owner per file (`docs/PROJECT-STRUCTURE.md` §12). Branch per task, PR into `main`, one review.
- CSS: colors only from `client/src/styles/theme.css`, class names with the owner prefix.
