import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

const MSG = { message: 'cohortId must be a positive whole number.' };

/** Required ?cohortId= on instructor list endpoints (API.md §20.5). */
export class CohortQueryDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt(MSG)
  @Min(1, MSG)
  cohortId: number;
}

export class CohortIdParamDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt(MSG)
  @Min(1, MSG)
  cohortId: number;
}

const USER_MSG = { message: 'userId must be a positive whole number.' };

export class UserIdParamDto {
  @ApiProperty({ example: 3 })
  @Type(() => Number)
  @IsInt(USER_MSG)
  @Min(1, USER_MSG)
  userId: number;
}
