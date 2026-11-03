import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, Min, ValidateNested } from 'class-validator';

const MSG = 'Answers must be a list of { questionId, optionId }.';

export class McqAnswerItemDto {
  @ApiProperty({ example: 7 })
  @IsInt({ message: MSG })
  @Min(1, { message: MSG })
  questionId: number;

  @ApiProperty({ example: 22 })
  @IsInt({ message: MSG })
  @Min(1, { message: MSG })
  optionId: number;
}

export class McqSubmitDto {
  @ApiProperty({ type: [McqAnswerItemDto] })
  @IsArray({ message: MSG })
  @ValidateNested({ each: true })
  @Type(() => McqAnswerItemDto)
  answers: McqAnswerItemDto[];
}
