import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: number;
  email: string;
  role: Role;
  /** UserSession id (Alpha, API.md §20.2). */
  sid: number;
}
