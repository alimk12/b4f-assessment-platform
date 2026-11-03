import { ExecutionMode } from '../../../types/execution.types';

export default function ExecutionModeNotice({ mode }: { mode: ExecutionMode | null }) {
  if (mode === 'JUDGE0') {
    return <div className="attempt__notice attempt__notice--real">Your code really runs on the server. Run checks the sample case; Submit checks the hidden cases.</div>;
  }
  return <div className="attempt__notice">[MOCK] Real code execution is not enabled on this server. Run and Submit only check that your code was received.</div>;
}
