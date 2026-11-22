import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from '../constants';

const PAGE_MSG = { message: 'page must be a positive whole number.' };
const LIMIT_MSG = { message: `limit must be a whole number from 1 to ${MAX_PAGE_LIMIT}.` };

/** ?page=&limit= for every new list endpoint (API.md §20.3). Extend it in feature query DTOs. */
export class PaginationQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt(PAGE_MSG)
  @Min(1, PAGE_MSG)
  page?: number;

  @ApiPropertyOptional({ example: DEFAULT_PAGE_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt(LIMIT_MSG)
  @Min(1, LIMIT_MSG)
  @Max(MAX_PAGE_LIMIT, LIMIT_MSG)
  limit?: number;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Prisma skip/take for a pagination query. */
export function pageArgs(q: PaginationQueryDto) {
  const page = q.page ?? 1;
  const limit = q.limit ?? DEFAULT_PAGE_LIMIT;
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

/** The `{ data, meta }` shape of every paginated response. */
export function paginated<T>(data: T[], total: number, q: PaginationQueryDto): { data: T[]; meta: PageMeta } {
  const { page, limit } = pageArgs(q);
  return { data, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}
