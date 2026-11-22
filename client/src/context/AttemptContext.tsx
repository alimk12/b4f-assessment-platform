import { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { ApiError } from '../services/http';
import * as api from '../services/student.api';
import { ClientViolationType } from '../types/common.types';
import { RunResult, SubmitResult } from '../types/execution.types';
import { AttemptIntegrity, McqAnswerPayload, StudentAttempt } from '../types/student.types';
import { saveAttemptSession } from '../utils/attemptSession';
import { getOffsetMs } from '../utils/serverClock';

interface Value {
  attempt: StudentAttempt | null;
  isAttemptLoading: boolean;
  attemptError: string | null;
  startAttempt(testId: number, acceptedRules: boolean): Promise<number | null>;
  loadAttempt(attemptId: number): Promise<void>;
  serverOffsetMs: number;
  isSubmitting: boolean;
  actionError: string | null;
  submitMcq(answers: McqAnswerPayload[]): Promise<boolean>;
  saveMcqAnswer(questionId: number, optionId: number | null): Promise<boolean>;
  savingQuestionIds: number[];
  failedQuestionIds: number[];
  runResults: Record<number, RunResult>;
  submitResults: Record<number, SubmitResult>;
  runningProblemId: number | null;
  runCode(problemId: number, code: string): Promise<boolean>;
  submitCode(problemId: number, code: string): Promise<boolean>;
  finishCoding(): Promise<boolean>;
  clearActionError(): void;
  integrity: AttemptIntegrity | null;
  lastWarning: string | null;
  reportViolation(type: ClientViolationType): Promise<void>;
  clearWarning(): void;
  isSessionReplaced: boolean;
}

const Ctx = createContext<Value | undefined>(undefined);
const message = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Please try again.');
const isSessionError = (e: unknown) => e instanceof ApiError && e.status === 409 && e.message.startsWith('This attempt is open in another window');
const needsReload = (e: unknown) =>
  e instanceof ApiError && e.status === 409 && /Time is over|ended because the exam rules|already been submitted/.test(e.message);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function AttemptProvider({ children }: { children: ReactNode }) {
  const [attempt, setAttempt] = useState<StudentAttempt | null>(null);
  const [isAttemptLoading, setIsAttemptLoading] = useState(false);
  const [attemptError, setAttemptError] = useState<string | null>(null);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savingQuestionIds, setSaving] = useState<number[]>([]);
  const [failedQuestionIds, setFailed] = useState<number[]>([]);
  const [runResults, setRunResults] = useState<Record<number, RunResult>>({});
  const [submitResults, setSubmitResults] = useState<Record<number, SubmitResult>>({});
  const [runningProblemId, setRunningProblemId] = useState<number | null>(null);
  const [integrity, setIntegrity] = useState<AttemptIntegrity | null>(null);
  const [lastWarning, setLastWarning] = useState<string | null>(null);
  const [isSessionReplaced, setIsSessionReplaced] = useState(false);
  const attemptRef = useRef<StudentAttempt | null>(null);
  attemptRef.current = attempt;

  const accept = useCallback((a: StudentAttempt) => {
    setAttempt(a);
    setIntegrity(a.integrity);
    setServerOffsetMs(getOffsetMs(a.serverNow));
  }, []);

  const loadAttempt = useCallback(async (attemptId: number) => {
    setIsAttemptLoading(true);
    setAttemptError(null);
    try {
      accept(await api.getAttempt(attemptId));
      setIsSessionReplaced(false);
    } catch (e) {
      if (isSessionError(e)) setIsSessionReplaced(true);
      else setAttemptError(message(e));
    } finally {
      setIsAttemptLoading(false);
    }
  }, [accept]);

  const handle = useCallback(async (e: unknown) => {
    if (isSessionError(e)) return setIsSessionReplaced(true);
    setActionError(message(e));
    const a = attemptRef.current;
    if (a && needsReload(e)) await loadAttempt(a.id);
  }, [loadAttempt]);

  const startAttempt = useCallback(async (testId: number, acceptedRules: boolean) => {
    setActionError(null);
    try {
      const a = await api.startAttempt(testId, acceptedRules);
      if (a.sessionKey) saveAttemptSession(a.id, a.sessionKey);
      accept(a);
      // A-6: re-opening a running exam is a device change; the server sends the warning to show.
      setLastWarning(a.deviceWarning ?? null);
      setIsSessionReplaced(false);
      setRunResults({});
      setSubmitResults({});
      return a.id;
    } catch (e) {
      setActionError(message(e));
      return null;
    }
  }, [accept]);

  const saveMcqAnswer = useCallback(async (questionId: number, optionId: number | null) => {
    const a = attemptRef.current;
    if (!a) return false;
    setSaving((s) => [...s.filter((x) => x !== questionId), questionId]);
    for (let attemptNo = 0; attemptNo < 4; attemptNo++) {
      try {
        await api.saveMcqAnswer(a.id, questionId, optionId);
        setSaving((s) => s.filter((x) => x !== questionId));
        setFailed((s) => s.filter((x) => x !== questionId));
        return true;
      } catch (e) {
        if (!(e instanceof ApiError) || e.status === 0 || e.status >= 500) {
          setFailed((s) => [...s.filter((x) => x !== questionId), questionId]);
          await sleep(2000);
          continue;
        }
        setSaving((s) => s.filter((x) => x !== questionId));
        await handle(e);
        return false;
      }
    }
    setSaving((s) => s.filter((x) => x !== questionId));
    return false;
  }, [handle]);

  const submitMcq = useCallback(async (answers: McqAnswerPayload[]) => {
    const a = attemptRef.current;
    if (!a) return false;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await api.submitMcq(a.id, answers);
      await loadAttempt(a.id);
      return true;
    } catch (e) {
      await handle(e);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [handle, loadAttempt]);

  const runCode = useCallback(async (problemId: number, code: string) => {
    const a = attemptRef.current;
    if (!a) return false;
    setRunningProblemId(problemId);
    setActionError(null);
    try {
      const r = await api.runCode(a.id, problemId, code);
      setRunResults((s) => ({ ...s, [problemId]: r }));
      setAttempt((cur) => cur && {
        ...cur,
        problems: cur.problems?.map((p) => (p.id === problemId ? { ...p, runCount: r.runCount, runsRemaining: r.runsRemaining } : p)) ?? null,
      });
      return true;
    } catch (e) {
      await handle(e);
      return false;
    } finally {
      setRunningProblemId(null);
    }
  }, [handle]);

  const submitCode = useCallback(async (problemId: number, code: string) => {
    const a = attemptRef.current;
    if (!a) return false;
    setIsSubmitting(true);
    setActionError(null);
    try {
      const r = await api.submitCode(a.id, problemId, code);
      setSubmitResults((s) => ({ ...s, [problemId]: r }));
      setAttempt((cur) => cur && {
        ...cur,
        problems: cur.problems?.map((p) =>
          p.id === problemId ? { ...p, submission: { passedCount: r.passedCount, totalCount: r.totalCount, points: r.points, submittedAt: r.submittedAt } } : p,
        ) ?? null,
      });
      return true;
    } catch (e) {
      await handle(e);
      if (e instanceof ApiError && e.status === 409) await loadAttempt(a.id);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [handle, loadAttempt]);

  const finishCoding = useCallback(async () => {
    const a = attemptRef.current;
    if (!a) return false;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await api.finishCoding(a.id);
      await loadAttempt(a.id);
      return true;
    } catch (e) {
      await handle(e);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [handle, loadAttempt]);

  const reportViolation = useCallback(async (type: ClientViolationType) => {
    const a = attemptRef.current;
    if (!a || a.status !== 'IN_PROGRESS') return;
    for (let i = 0; i < 2; i++) {
      try {
        const r = await api.reportViolation(a.id, type);
        setIntegrity({
          focusViolations: r.focusViolations, focusLimit: r.focusLimit,
          clipboardViolations: r.clipboardViolations, clipboardLimit: r.clipboardLimit,
          deviceSwitches: r.deviceSwitches, deviceAllowed: r.deviceAllowed,
        });
        if (r.warning) setLastWarning(r.warning);
        if (r.terminated) {
          setLastWarning(null);
          await loadAttempt(a.id);
        }
        return;
      } catch (e) {
        if (e instanceof ApiError && e.status !== 0) {
          await handle(e);
          return;
        }
      }
    }
  }, [handle, loadAttempt]);

  const value = useMemo<Value>(
    () => ({
      attempt, isAttemptLoading, attemptError, startAttempt, loadAttempt, serverOffsetMs, isSubmitting, actionError,
      submitMcq, saveMcqAnswer, savingQuestionIds, failedQuestionIds, runResults, submitResults, runningProblemId,
      runCode, submitCode, finishCoding, clearActionError: () => setActionError(null), integrity, lastWarning,
      reportViolation, clearWarning: () => setLastWarning(null), isSessionReplaced,
    }),
    [attempt, isAttemptLoading, attemptError, startAttempt, loadAttempt, serverOffsetMs, isSubmitting, actionError, submitMcq,
      saveMcqAnswer, savingQuestionIds, failedQuestionIds, runResults, submitResults, runningProblemId, runCode, submitCode,
      finishCoding, integrity, lastWarning, reportViolation, isSessionReplaced],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAttempt() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAttempt must be used inside AttemptProvider');
  return ctx;
}
