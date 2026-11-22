import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AttemptsQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'testId must be a positive whole number.' })
  @Min(1, { message: 'testId must be a positive whole number.' })
  testId?: number;

  @ApiPropertyOptional({ enum: ['IN_PROGRESS', 'SUBMITTED', 'EXPIRED', 'TERMINATED'] })
  @IsOptional()
  @IsIn(['IN_PROGRESS', 'SUBMITTED', 'EXPIRED', 'TERMINATED'], {
    message: 'status must be IN_PROGRESS, SUBMITTED, EXPIRED or TERMINATED.',
  })
  status?: 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED' | 'TERMINATED';

  @ApiPropertyOptional({ example: 'lina' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  search?: string;
}
