import { randomInt } from 'crypto';
import { JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH } from '../common/constants';

/** 8 random characters without 0/O/1/I (API.md §20.4). */
export function generateJoinCode(): string {
  let code = '';
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) code += JOIN_CODE_ALPHABET[randomInt(JOIN_CODE_ALPHABET.length)];
  return code;
}
