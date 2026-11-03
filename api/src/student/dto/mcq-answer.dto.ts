import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, ValidateIf } from 'class-validator';

const MSG = 'optionId must be a positive whole number or null.';

export class McqAnswerDto {
  @ApiProperty({ example: 22, nullable: true })
  @ValidateIf((o) => o.optionId !== null)
  @IsInt({ message: MSG })
  @Min(1, { message: MSG })
  optionId: number | null;
}
