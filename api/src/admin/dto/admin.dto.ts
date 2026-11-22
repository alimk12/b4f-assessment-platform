import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Min,
  MinLength,
} from 'class-validator';
import { MIN_PASSWORD_LENGTH } from '../../common/constants';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const positive = (name: string) => ({ message: `${name} must be a positive whole number.` });

export class CreateCityDto {
  @ApiProperty({ example: 'Homs' })
  @Transform(trim)
  @IsString({ message: 'City name must be 2 to 60 characters.' })
  @Length(2, 60, { message: 'City name must be 2 to 60 characters.' })
  name: string;
}

export class CohortsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt(positive('cityId'))
  @Min(1, positive('cityId'))
  cityId?: number;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'ARCHIVED'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'ARCHIVED'], { message: 'status must be ACTIVE or ARCHIVED.' })
  status?: 'ACTIVE' | 'ARCHIVED';
}

export class CreateCohortDto {
  @ApiProperty({ example: 'Cohort 9' })
  @Transform(trim)
  @IsString({ message: 'Cohort name must be 2 to 60 characters.' })
  @Length(2, 60, { message: 'Cohort name must be 2 to 60 characters.' })
  name: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt(positive('cityId'))
  @Min(1, positive('cityId'))
  cityId: number;

  @ApiPropertyOptional({ example: 2, description: 'Copy the content of the three tests from this cohort (A-2)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt(positive('copyFromCohortId'))
  @Min(1, positive('copyFromCohortId'))
  copyFromCohortId?: number;
}

export class InstructorsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'rana' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  search?: string;
}

export class CreateInstructorDto {
  @ApiProperty({ example: 'Rana Haddad' })
  @Transform(trim)
  @IsString({ message: 'Full name is required.' })
  @IsNotEmpty({ message: 'Full name is required.' })
  fullName: string;

  @ApiProperty({ example: 'rana@b4f.local' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'A valid email address is required.' })
  email: string;

  @ApiProperty({ example: 'secret123' })
  @IsString({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` })
  @MinLength(MIN_PASSWORD_LENGTH, { message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` })
  password: string;

  @ApiPropertyOptional({ example: [4], type: [Number] })
  @IsOptional()
  @IsArray({ message: 'cohortIds must be a list of cohort ids.' })
  @ArrayUnique({ message: 'cohortIds must not repeat a cohort.' })
  @Type(() => Number)
  @IsInt({ each: true, message: 'cohortIds must be a list of cohort ids.' })
  @Min(1, { each: true, message: 'cohortIds must be a list of cohort ids.' })
  cohortIds?: number[];
}

export class UpdateInstructorDto {
  @ApiPropertyOptional({ example: 'Rana Haddad' })
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'Full name is required.' })
  @IsNotEmpty({ message: 'Full name is required.' })
  fullName?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be true or false.' })
  isActive?: boolean;
}

export class CohortInstructorParamDto {
  @ApiProperty({ example: 4 })
  @Type(() => Number)
  @IsInt(positive('cohortId'))
  @Min(1, positive('cohortId'))
  cohortId: number;

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsInt(positive('userId'))
  @Min(1, positive('userId'))
  userId: number;
}
