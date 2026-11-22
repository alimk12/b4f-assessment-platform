import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { MIN_PASSWORD_LENGTH } from '../../common/constants';

export class RegisterDto {
  @ApiProperty({ example: 'Lina Saleh' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Full name is required.' })
  @IsNotEmpty({ message: 'Full name is required.' })
  fullName: string;

  @ApiProperty({ example: 'lina@example.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'A valid email address is required.' })
  email: string;

  @ApiProperty({ example: 'secret123' })
  @IsString({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` })
  @MinLength(MIN_PASSWORD_LENGTH, { message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` })
  password: string;

  @ApiProperty({ example: 'K7QM4XRT', description: 'The cohort join code from the instructor (Alpha A-11)' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString({ message: 'Cohort code is required.' })
  @IsNotEmpty({ message: 'Cohort code is required.' })
  joinCode: string;
}
