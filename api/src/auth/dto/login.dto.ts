import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'lina@example.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString({ message: 'Invalid email or password.' })
  email: string;

  @ApiProperty({ example: 'secret123' })
  @IsString({ message: 'Invalid email or password.' })
  password: string;
}
