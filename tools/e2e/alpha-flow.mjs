// Alpha checks (docs/API.md §20.10). Needs the API running on a freshly seeded database.
// Run it AFTER api-flow.mjs: at the end it replaces Cohort 9's join code, which api-flow uses.
// Usage: node tools/e2e/alpha-flow.mjs        (API_URL=http://localhost:3000/api by default)
const B = process.env.API_URL ?? 'http://localhost:3000/api';
let pass = 0, fail = 0;
const ok = (c, m, extra) => { if (c) pass++; else { fail++; console.log('FAIL:', m, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ''); } };
async function call(method, path, { token, body, session } = {}) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  if (session) h['X-Attempt-Session'] = session;
  const r = await fetch(B + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  let data = null; try { data = await r.json(); } catch {}
  return { s: r.status, d: data };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const login = async (email, password) => (await call('POST', '/auth/login', { body: { email, password } })).d?.accessToken;
const stamp = Date.now();
let r;

// ---------- Accounts and roles ----------
const admin = await login('admin@b4f.local', 'Admin123');
const ins = await login('instructor@b4f.local', 'Instructor123');
const rana = await login('rana@b4f.local', 'Instructor123');
ok(admin && ins && rana, 'seed accounts sign in');
r = await call('GET', '/admin/cities', { token: ins }); ok(r.s === 403, 'instructor on /admin -> 403', r);
r = await call('GET', '/auth/me', { token: ins }); ok(r.d.role === 'INSTRUCTOR' && r.d.cohorts.length === 2 && r.d.cohort === null, '/auth/me lists instructor cohorts', r);

const myCohorts = (await call('GET', '/instructor/cohorts', { token: ins })).d;
const c9 = myCohorts.find((c) => c.joinCode === 'SALAM9XX');
const c8 = myCohorts.find((c) => c.joinCode === 'SALAM8XX');
const homs = (await call('GET', '/instructor/cohorts', { token: rana })).d[0];
ok(c9 && c8 && c8.status === 'ARCHIVED' && homs?.joinCode === 'HMS3XXXX', 'seed cohorts', { c9, c8, homs });

// ---------- Admin: city, cohort copied from another, instructor ----------
const city = await call('POST', '/admin/cities', { token: admin, body: { name: `Hama ${stamp}` } });
ok(city.s === 201, 'create city', city);
r = await call('POST', '/admin/cities', { token: admin, body: { name: 'homs' } });
ok(r.s === 409 && r.d.message === 'A city with this name already exists.', 'duplicate city (any case)', r);
const cohort = await call('POST', '/admin/cohorts', { token: admin, body: { name: 'Cohort 1', cityId: city.d.id, copyFromCohortId: c9.id } });
ok(cohort.s === 201 && /^[A-HJ-NP-Z2-9]{8}$/.test(cohort.d.joinCode), 'create cohort with a valid join code', cohort);
r = await call('POST', '/admin/cohorts', { token: admin, body: { name: 'cohort 1', cityId: city.d.id } });
ok(r.s === 409 && r.d.message === 'This city already has a cohort with this name.', 'duplicate cohort name', r);
r = await call('GET', `/instructor/tests?cohortId=${cohort.d.id}`, { token: admin });
ok(r.d.length === 3 && r.d.every((t) => t.status === 'DRAFT' && !t.isContentLocked) && r.d[0].questionCount >= 10 && r.d[2].problemCount === 2,
  'new cohort has 3 DRAFT copied tests', r.d);
const newIns = await call('POST', '/admin/instructors', { token: admin, body: { fullName: 'Nour', email: `nour${stamp}@b4f.local`, password: 'secret123' } });
ok(newIns.s === 201 && newIns.d.cohorts.length === 0, 'create instructor', newIns);
r = await call('POST', `/admin/cohorts/${cohort.d.id}/instructors/${newIns.d.id}`, { token: admin });
ok(r.s === 201 && r.d.instructors.some((i) => i.id === newIns.d.id), 'link instructor', r);
r = await call('POST', `/admin/cohorts/${cohort.d.id}/instructors/${newIns.d.id}`, { token: admin });
ok(r.s === 409, 'link twice -> 409', r);
const nour = await login(`nour${stamp}@b4f.local`, 'secret123');
r = await call('GET', `/instructor/tests?cohortId=${cohort.d.id}`, { token: nour }); ok(r.s === 200, 'linked instructor sees the cohort', r);
r = await call('GET', `/instructor/tests?cohortId=${c9.id}`, { token: nour }); ok(r.s === 403 && r.d.message === 'You do not have access to this cohort.', 'other cohort -> 403', r);
r = await call('PATCH', `/admin/instructors/${newIns.d.id}`, { token: admin, body: { isActive: false } });
ok(r.d.isActive === false, 'disable instructor', r);
r = await call('GET', '/auth/me', { token: nour }); ok(r.s === 401 && r.d.message === 'You were signed out. Please sign in again.', 'disabled token -> 401', r);
r = await call('POST', '/auth/login', { body: { email: `nour${stamp}@b4f.local`, password: 'secret123' } });
ok(r.s === 403 && r.d.message === 'This account is disabled. Please contact your instructor.', 'disabled login -> 403', r);

// ---------- Register with join code ----------
const email = `alpha${stamp}@t.local`;
r = await call('POST', '/auth/register', { body: { fullName: 'A', email, password: 'secret123' } });
ok(r.s === 400 && r.d.message === 'Cohort code is required.', 'join code required', r);
r = await call('POST', '/auth/register', { body: { fullName: 'A', email, password: 'secret123', joinCode: 'NOPE1234' } });
ok(r.s === 400 && r.d.message === 'This cohort code is not valid.', 'unknown code', r);
r = await call('POST', '/auth/register', { body: { fullName: 'A', email, password: 'secret123', joinCode: 'salam8xx' } });
ok(r.s === 400 && r.d.message === 'This cohort is closed for new sign-ups.', 'archived cohort code', r);
r = await call('POST', '/auth/register', { body: { fullName: 'Alpha Student', email, password: 'secret123', joinCode: ' salam9xx ' } });
ok(r.s === 201 && r.d.user.cohort?.id === c9.id, 'register into cohort 9', r);
const s1 = r.d.accessToken;

// ---------- Student sees only their cohort ----------
const homsTests = (await call('GET', `/instructor/tests?cohortId=${homs.id}`, { token: rana })).d;
const c9TestIds = new Set((await call('GET', `/instructor/tests?cohortId=${c9.id}`, { token: ins })).d.map((t) => t.id));
r = await call('GET', '/student/tests', { token: s1 });
ok(r.d.length >= 2 && r.d.every((t) => c9TestIds.has(t.id)) && r.d[0].state === 'AVAILABLE', 'student sees only cohort 9 published tests', r);
const iq = r.d[0];
r = await call('GET', `/student/tests/${homsTests[0].id}`, { token: s1 }); ok(r.s === 404, 'other cohort test -> 404', r);
r = await call('POST', `/student/tests/${homsTests[0].id}/attempts`, { token: s1, body: { acceptedRules: true } }); ok(r.s === 404, 'start other cohort -> 404', r);
r = await call('GET', '/instructor/bank/tests', { token: s1 }); ok(r.s === 403, 'student on the bank -> 403', r);

// ---------- One sign-in per student (A-9) ----------
const s2 = await login(email, 'secret123');
r = await call('GET', '/auth/me', { token: s1 });
ok(r.s === 401 && r.d.message === 'You were signed out because your account was used on another device.', 'older device signed out', r);

// ---------- Device switches + alerts (A-6, A-7, A-8) ----------
const a0 = (await call('POST', `/student/tests/${iq.id}/attempts`, { token: s2, body: { acceptedRules: true } })).d;
ok(a0.status === 'IN_PROGRESS' && a0.deviceWarning === null && a0.integrity.deviceSwitches === 0, 'start: no device warning', a0);
r = await call('POST', `/student/attempts/${a0.id}/violations`, { token: s2, session: a0.sessionKey, body: { type: 'DEVICE_SWITCH' } });
ok(r.s === 400 && r.d.message === 'Unknown violation type.', 'client cannot send DEVICE_SWITCH', r);
r = await call('POST', `/student/attempts/${a0.id}/violations`, { token: s2, session: a0.sessionKey, body: { type: 'FULLSCREEN_EXIT' } });
ok(r.d.counted && r.d.deviceSwitches === 0 && r.d.deviceAllowed === 2, 'violation response has device counts', r);
for (const n of [1, 2]) {
  await sleep(2100);
  r = await call('POST', `/student/tests/${iq.id}/attempts`, { token: s2, body: { acceptedRules: true } });
  ok(r.s === 200 && r.d.status === 'IN_PROGRESS' && r.d.sessionKey && r.d.deviceWarning?.includes(`Device change ${n} of 2`), `device switch ${n} -> warning`, r.d);
}
await sleep(2100);
r = await call('POST', `/student/tests/${iq.id}/attempts`, { token: s2, body: { acceptedRules: true } });
ok(r.d.status === 'TERMINATED' && r.d.sessionKey === null && r.d.result.terminationReason === 'Opened the exam on another device 3 times.',
  '3rd device switch ends the exam', r.d);

r = await call('GET', `/instructor/attempts?cohortId=${c9.id}&search=Alpha Student`, { token: ins });
ok(r.d.length === 1 && r.d[0].deviceSwitchCount === 3 && r.d[0].status === 'TERMINATED', 'attempts row has deviceSwitchCount', r.d);
r = await call('GET', `/instructor/attempts/${a0.id}`, { token: ins });
ok(r.d.violationSummary?.device.count === 3 && r.d.violationSummary.focus.count === 1 && r.d.violations.some((v) => v.type === 'DEVICE_SWITCH' && v.group === 'DEVICE'),
  'detail violationSummary + DEVICE log rows', r.d);
r = await call('GET', `/instructor/attempts/${a0.id}`, { token: rana }); ok(r.s === 403, 'other instructor cannot open the attempt', r);
r = await call('GET', `/instructor/attempts?cohortId=${c9.id}`, { token: rana }); ok(r.s === 403, 'other instructor cannot list the cohort', r);

r = await call('GET', `/instructor/alerts?cohortId=${c9.id}&limit=50`, { token: ins });
const mine = r.d.data.filter((a) => a.attemptId === a0.id);
ok(mine.length === 5 && mine.filter((a) => a.severity === 'DANGER').length === 4 && mine.some((a) => a.type === 'ATTEMPT_TERMINATED')
  && mine.some((a) => a.type === 'FULLSCREEN_EXIT' && a.severity === 'WARNING'), '5 alerts: 3 device + 1 terminated (danger), 1 full screen (warning)', mine);
ok(mine.some((a) => a.message === 'Alpha Student opened IQ Test on another device (3 of 2, exam ended).'), 'fixed alert message', mine.map((a) => a.message));
r = await call('GET', '/instructor/alerts/unread-count', { token: ins }); ok(r.d.count >= 5 && r.d.dangerCount >= 4, 'unread count', r);
r = await call('PATCH', `/instructor/alerts/${mine[0].id}/read`, { token: rana }); ok(r.s === 403, 'other instructor cannot mark read', r);
r = await call('PATCH', `/instructor/alerts/${mine[0].id}/read`, { token: ins }); ok(r.d.readAt && r.d.readBy?.fullName === 'Instructor Demo', 'mark one read', r);
r = await call('PATCH', `/instructor/alerts/read-all?cohortId=${c9.id}`, { token: ins }); ok(r.s === 200 && r.d.updated >= 4, 'read all', r);
r = await call('GET', `/instructor/alerts/unread-count?cohortId=${c9.id}`, { token: ins }); ok(r.d.count === 0, 'nothing unread', r);
r = await call('GET', `/instructor/alerts?cohortId=${c9.id}&page=0`, { token: ins }); ok(r.s === 400 && r.d.message === 'page must be a positive whole number.', 'bad page', r);

// ---------- Student management (A-11) ----------
const sid = (await call('GET', `/instructor/cohorts/${c9.id}/students?search=alpha${stamp}`, { token: ins })).d.data[0]?.id;
ok(!!sid, 'find student by email');
r = await call('POST', `/instructor/cohorts/${c9.id}/students`, { token: ins, body: { fullName: 'Made By Instructor', email: `made${stamp}@t.local`, password: 'secret123' } });
ok(r.s === 201 && r.d.cohortId === c9.id && r.d.lastSignInAt === null, 'instructor creates a student', r);
r = await call('POST', `/instructor/cohorts/${c9.id}/students`, { token: ins, body: { fullName: 'X', email, password: 'secret123' } });
ok(r.s === 409 && r.d.message === 'An account with this email already exists.', 'duplicate student email', r);
r = await call('POST', `/instructor/cohorts/${c8.id}/students`, { token: ins, body: { fullName: 'X', email: `x${stamp}@t.local`, password: 'secret123' } });
ok(r.s === 409 && r.d.message === 'This cohort is archived.', 'no new student in an archived cohort', r);
r = await call('PATCH', `/instructor/students/${sid}`, { token: rana, body: { fullName: 'Hack' } });
ok(r.s === 404 && r.d.message === 'Student not found.', 'other cohort student -> 404', r);
r = await call('PATCH', `/instructor/students/${sid}`, { token: ins, body: { fullName: 'Alpha Renamed' } }); ok(r.d.fullName === 'Alpha Renamed', 'rename student', r);
r = await call('POST', `/instructor/students/${sid}/sign-out`, { token: ins }); ok(r.s === 204, 'sign out everywhere', r);
r = await call('GET', '/auth/me', { token: s2 }); ok(r.s === 401 && r.d.message === 'You were signed out. Please sign in again.', 'student signed out', r);
r = await call('POST', `/instructor/students/${sid}/reset-password`, { token: ins, body: { newPassword: 'short' } }); ok(r.s === 400, 'short new password', r);
r = await call('POST', `/instructor/students/${sid}/reset-password`, { token: ins, body: { newPassword: 'newsecret123' } }); ok(r.s === 204, 'reset password', r);
ok(!(await login(email, 'secret123')) && !!(await login(email, 'newsecret123')), 'only the new password works');
r = await call('PATCH', `/instructor/students/${sid}`, { token: ins, body: { isActive: false } }); ok(r.d.isActive === false, 'disable student', r);
r = await call('POST', '/auth/login', { body: { email, password: 'newsecret123' } }); ok(r.s === 403, 'disabled student cannot sign in', r);

// ---------- Question bank and copy (A-12) ----------
r = await call('GET', '/instructor/bank/tests?type=MCQ&limit=2', { token: rana });
ok(r.s === 200 && r.d.data.length === 2 && r.d.meta.total >= 6 && r.d.meta.totalPages >= 3, 'bank list paginated', r.d.meta);
const c9Tests = (await call('GET', `/instructor/tests?cohortId=${c9.id}`, { token: ins })).d;
const source = (await call('GET', `/instructor/bank/tests/${c9Tests[0].id}`, { token: rana })).d;
ok(source.isMine === false && source.questions[0].options.some((o) => o.isCorrect) && source.city.name === 'Salamiyah', 'bank detail with answers', source);
const homsIq = homsTests[0];
const before = (await call('GET', `/instructor/tests/${homsIq.id}`, { token: rana })).d.questions.length;
r = await call('POST', `/instructor/tests/${homsIq.id}/questions/copy`, { token: rana, body: { sourceQuestionId: source.questions[0].id } });
ok(r.s === 201 && r.d.id !== source.questions[0].id && r.d.text === source.questions[0].text, 'copy one question', r);
r = await call('POST', `/instructor/tests/${homsIq.id}/copy-from`, { token: rana, body: { sourceTestId: source.id } });
ok(r.s === 200 && r.d.questions.length === before + 1 + source.questions.length, 'copy a whole test', r.d?.questions?.length);
r = await call('POST', `/instructor/tests/${homsTests[2].id}/questions/copy`, { token: rana, body: { sourceQuestionId: source.questions[0].id } });
ok(r.s === 400 && r.d.message === 'You can only copy into a test of the same type.', 'copy into another type -> 400', r);
r = await call('POST', `/instructor/tests/${homsIq.id}/copy-from`, { token: rana, body: { sourceTestId: homsIq.id } });
ok(r.s === 400 && r.d.message === 'A test cannot be copied into itself.', 'copy into itself -> 400', r);
r = await call('POST', `/instructor/tests/${c9Tests[0].id}/copy-from`, { token: ins, body: { sourceTestId: homsIq.id } });
ok(r.s === 409, 'copy into a locked test -> 409 (R-4)', r);
r = await call('POST', `/instructor/tests/${c9Tests[0].id}/copy-from`, { token: rana, body: { sourceTestId: homsIq.id } });
ok(r.s === 403, 'copy into another cohort -> 403', r);
const after = (await call('GET', `/instructor/bank/tests/${c9Tests[0].id}`, { token: rana })).d;
ok(after.questions.length === source.questions.length, 'the source never changes');

// ---------- Archive ----------
r = await call('PATCH', `/admin/cohorts/${cohort.d.id}/archive`, { token: admin }); ok(r.d.status === 'ARCHIVED' && r.d.archivedAt, 'archive cohort', r);
r = await call('PATCH', `/admin/cohorts/${cohort.d.id}/archive`, { token: admin }); ok(r.s === 409, 'archive twice -> 409', r);
r = await call('POST', '/auth/register', { body: { fullName: 'Late', email: `late${stamp}@t.local`, password: 'secret123', joinCode: cohort.d.joinCode } });
ok(r.s === 400 && r.d.message === 'This cohort is closed for new sign-ups.', 'archived code refused', r);
r = await call('POST', `/admin/cohorts/${c9.id}/join-code`, { token: admin });
ok(r.s === 200 && r.d.joinCode !== 'SALAM9XX', 'new join code', r);
r = await call('POST', '/auth/register', { body: { fullName: 'Old Code', email: `old${stamp}@t.local`, password: 'secret123', joinCode: 'SALAM9XX' } });
ok(r.s === 400 && r.d.message === 'This cohort code is not valid.', 'old code stops working', r);

// ---------- Logout ----------
r = await call('POST', '/auth/logout', { token: ins }); ok(r.s === 204, 'logout', r);
r = await call('GET', '/auth/me', { token: ins }); ok(r.s === 401, 'token ends at logout', r);

console.log(`PASS ${pass}  FAIL ${fail}`);
process.exitCode = fail ? 1 : 0;
