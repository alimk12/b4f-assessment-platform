import { AlertType } from '@prisma/client';
import { CLIPBOARD_VIOLATION_LIMIT, DEVICE_SWITCH_ALLOWED, FOCUS_VIOLATION_LIMIT } from '../common/constants';

/** Fixed alert messages (API.md §20.4). `n` is the counted number of the violation in its group. */
export function alertMessage(type: Exclude<AlertType, 'ATTEMPT_TERMINATED'>, student: string, test: string, n: number): string {
  switch (type) {
    case 'DEVICE_SWITCH':
      return n > DEVICE_SWITCH_ALLOWED
        ? `${student} opened ${test} on another device (${n} of ${DEVICE_SWITCH_ALLOWED}, exam ended).`
        : `${student} opened ${test} on another device (${n} of ${DEVICE_SWITCH_ALLOWED}).`;
    case 'FULLSCREEN_EXIT':
      return `${student} left full screen in ${test} (${n} of ${FOCUS_VIOLATION_LIMIT}).`;
    case 'TAB_HIDDEN':
      return `${student} switched away from ${test} (${n} of ${FOCUS_VIOLATION_LIMIT}).`;
    case 'COPY':
    case 'CUT':
      return `${student} tried to copy in ${test} (${n} of ${CLIPBOARD_VIOLATION_LIMIT}).`;
    case 'PASTE_EXTERNAL':
    case 'DROP_EXTERNAL':
      return `${student} tried to paste from outside in ${test} (${n} of ${CLIPBOARD_VIOLATION_LIMIT}).`;
  }
}

export const terminationAlertMessage = (student: string, test: string, reason: string) => `${student}'s ${test} was ended: ${reason}`;
