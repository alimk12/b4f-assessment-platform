import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

const msg = (name: string) => ({ message: `${name} must be a positive whole number.` });

export class CopyTestDto {
  @ApiProperty({ example: 11 })
  @Type(() => Number)
  @IsInt(msg('sourceTestId'))
  @Min(1, msg('sourceTestId'))
  sourceTestId: number;
}

export class CopyQuestionDto {
  @ApiProperty({ example: 70 })
  @Type(() => Number)
  @IsInt(msg('sourceQuestionId'))
  @Min(1, msg('sourceQuestionId'))
  sourceQuestionId: number;
}

export class CopyProblemDto {
  @ApiProperty({ example: 9 })
  @Type(() => Number)
  @IsInt(msg('sourceProblemId'))
  @Min(1, msg('sourceProblemId'))
  sourceProblemId: number;
}
