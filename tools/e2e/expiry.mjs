import { execSync } from 'child_process';
// Server timer, grace period and EXPIRED state. Needs psql on PATH and a freshly seeded database.
// DATABASE_URL defaults to the local development database; API_URL to http://localhost:3000/api.
const B = process.env.API_URL ?? 'http://localhost:3000/api';
const DB = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/b4f_assessment';
const call = async (m, p, { token, body, session } = {}) => {
  const h = { 'Content-Type': 'application/json' }; if (token) h.Authorization = `Bearer ${token}`; if (session) h['X-Attempt-Session'] = session;
  const r = await fetch(B + p, { method: m, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  return { s: r.status, d: await r.json().catch(() => null) };
};
let pass = 0, fail = 0; const ok = (c, m, x) => (c ? pass++ : (fail++, console.log('FAIL', m, JSON.stringify(x))));
const email = `exp${Date.now()}@t.local`;
// Alpha: students join a cohort with its code (Cohort 9 - Salamiyah in the seed).
const joinCode = process.env.JOIN_CODE ?? 'SALAM9XX';
const t = (await call('POST', '/auth/register', { body: { fullName: 'Expiry Student', email, password: 'secret123', joinCode } })).d.accessToken;
const [iq, html] = (await call('GET', '/student/tests', { token: t })).d;
const a = (await call('POST', `/student/tests/${iq.id}/attempts`, { token: t, body: { acceptedRules: true } })).d;
const psql = (sql) => execSync(`psql "${DB}" -q -c "${sql}"`);
// deadline 5 s ago: inside the 10 s grace -> accepted
psql(`UPDATE attempts SET deadline = (now() at time zone 'utc') - interval '5 seconds' WHERE id = ${a.id}`);
let r = await call('PUT', `/student/attempts/${a.id}/mcq-answers/${a.questions[0].id}`, { token: t, session: a.sessionKey, body: { optionId: a.questions[0].options[0].id } });
ok(r.s === 200, 'grace accepted', r);
// deadline 30 s ago: past grace -> rejected, stored EXPIRED
psql(`UPDATE attempts SET deadline = (now() at time zone 'utc') - interval '30 seconds' WHERE id = ${a.id}`);
r = await call('POST', `/student/attempts/${a.id}/mcq-submit`, { token: t, session: a.sessionKey, body: { answers: [] } });
ok(r.s === 409 && r.d.message === 'Time is over. This attempt expired and was not submitted.', 'late rejected', r);
r = await call('GET', '/student/tests', { token: t });
ok(r.d[0].state === 'EXPIRED' && r.d[0].score === null && r.d[1].state === 'AVAILABLE', 'expired + next unlocked', r);
// expiry on read, with no request from the student
const a2 = (await call('POST', `/student/tests/${html.id}/attempts`, { token: t, body: { acceptedRules: true } })).d;
psql(`UPDATE attempts SET deadline = (now() at time zone 'utc') - interval '60 seconds' WHERE id = ${a2.id}`);
r = await call('GET', '/student/results', { token: t });
ok(r.d.some((x) => x.testId === html.id && x.status === 'EXPIRED' && x.label === 'Expired — not submitted' && x.score === null), 'expired on read', r);
console.log(`PASS ${pass} FAIL ${fail}`);
