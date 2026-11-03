import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { MAX_OPTIONS, MIN_OPTIONS } from '../../common/constants';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const OPTIONS_MSG = `A question needs between ${MIN_OPTIONS} and ${MAX_OPTIONS} options.`;

export class OptionDto {
  @ApiProperty({ example: '32' })
  @Transform(trim)
  @IsString({ message: 'Every option needs text.' })
  @IsNotEmpty({ message: 'Every option needs text.' })
  text: string;

  @ApiProperty({ example: true })
  @IsBoolean({ message: 'isCorrect must be true or false.' })
  isCorrect: boolean;
}

export class QuestionDto {
  @ApiProperty({ example: 'Which number comes next: 2, 4, 8, 16, ?' })
  @Transform(trim)
  @IsString({ message: 'Question text is required.' })
  @IsNotEmpty({ message: 'Question text is required.' })
  text: string;

  @ApiProperty({ type: [OptionDto] })
  @IsArray({ message: OPTIONS_MSG })
  @ArrayMinSize(MIN_OPTIONS, { message: OPTIONS_MSG })
  @ArrayMaxSize(MAX_OPTIONS, { message: OPTIONS_MSG })
  @ValidateNested({ each: true })
  @Type(() => OptionDto)
  options: OptionDto[];
}
