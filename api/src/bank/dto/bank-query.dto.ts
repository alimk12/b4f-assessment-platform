import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const positive = (name: string) => ({ message: `${name} must be a positive whole number.` });

export class BankQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt(positive('cityId'))
  @Min(1, positive('cityId'))
  cityId?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt(positive('cohortId'))
  @Min(1, positive('cohortId'))
  cohortId?: number;

  @ApiPropertyOptional({ enum: ['MCQ', 'CODING'] })
  @IsOptional()
  @IsIn(['MCQ', 'CODING'], { message: 'type must be MCQ or CODING.' })
  type?: 'MCQ' | 'CODING';

  @ApiPropertyOptional({ example: 'flex', description: 'Test title, question text or problem title' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  search?: string;
}
