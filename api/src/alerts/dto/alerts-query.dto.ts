import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const COHORT_MSG = { message: 'cohortId must be a positive whole number.' };
const toBool = ({ value }: { value: unknown }) => (value === 'true' ? true : value === 'false' ? false : value);

export class AlertsQueryDto extends PaginationQueryDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt(COHORT_MSG)
  @Min(1, COHORT_MSG)
  cohortId: number;

  @ApiPropertyOptional({ enum: ['DANGER', 'WARNING'] })
  @IsOptional()
  @IsIn(['DANGER', 'WARNING'], { message: 'severity must be DANGER or WARNING.' })
  severity?: 'DANGER' | 'WARNING';

  @ApiPropertyOptional({ example: true, description: 'true = only unread alerts' })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean({ message: 'unread must be true or false.' })
  unread?: boolean;
}

export class UnreadCountQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Without cohortId: every cohort of the caller' })
  @IsOptional()
  @Type(() => Number)
  @IsInt(COHORT_MSG)
  @Min(1, COHORT_MSG)
  cohortId?: number;
}

export class CohortRequiredQueryDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt(COHORT_MSG)
  @Min(1, COHORT_MSG)
  cohortId: number;
}

export class AlertIdParamDto {
  @ApiProperty({ example: 91 })
  @Type(() => Number)
  @IsInt({ message: 'alertId must be a positive whole number.' })
  @Min(1, { message: 'alertId must be a positive whole number.' })
  alertId: number;
}
