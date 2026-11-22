import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { MIN_PASSWORD_LENGTH } from '../../common/constants';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const email = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);
const PASSWORD_MSG = { message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };

export class StudentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'lina', description: 'Part of the name or the email' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'DISABLED'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'DISABLED'], { message: 'status must be ACTIVE or DISABLED.' })
  status?: 'ACTIVE' | 'DISABLED';
}

export class CreateStudentDto {
  @ApiProperty({ example: 'Omar Khaled' })
  @Transform(trim)
  @IsString({ message: 'Full name is required.' })
  @IsNotEmpty({ message: 'Full name is required.' })
  fullName: string;

  @ApiProperty({ example: 'omar@example.com' })
  @Transform(email)
  @IsEmail({}, { message: 'A valid email address is required.' })
  email: string;

  @ApiProperty({ example: 'secret123' })
  @IsString(PASSWORD_MSG)
  @MinLength(MIN_PASSWORD_LENGTH, PASSWORD_MSG)
  password: string;
}

export class UpdateStudentDto {
  @ApiPropertyOptional({ example: 'Omar Khaled' })
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'Full name is required.' })
  @IsNotEmpty({ message: 'Full name is required.' })
  fullName?: string;

  @ApiPropertyOptional({ example: 'omar.k@example.com' })
  @IsOptional()
  @Transform(email)
  @IsEmail({}, { message: 'A valid email address is required.' })
  email?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be true or false.' })
  isActive?: boolean;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'newsecret123' })
  @IsString(PASSWORD_MSG)
  @MinLength(MIN_PASSWORD_LENGTH, PASSWORD_MSG)
  newPassword: string;
}
