import { ApiProperty } from '@nestjs/swagger';
import { Allow, IsArray, IsIn } from 'class-validator';

export class TestCaseDto {
  @ApiProperty({ enum: ['SAMPLE', 'HIDDEN'] })
  @IsIn(['SAMPLE', 'HIDDEN'], { message: 'visibility must be SAMPLE or HIDDEN.' })
  visibility: 'SAMPLE' | 'HIDDEN';

  @ApiProperty({ example: [[2, 7, 11, 15], 9], description: 'The function arguments, in order' })
  @IsArray({ message: 'Test case arguments must be a JSON array.' })
  args: unknown[];

  @ApiProperty({ example: [0, 1], description: 'The value the function must return' })
  @Allow()
  expected: unknown;
}
