import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsString, Matches, Max, Min, ValidateNested } from 'class-validator';
import { MAX_POINTS } from '../../common/constants';
import { TestCaseDto } from './test-case.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const POINTS_MSG = `Points must be a whole number from 1 to ${MAX_POINTS}.`;
const FN_MSG = 'Function name must be a valid JavaScript name, for example twoSum.';

export class ProblemDto {
  @ApiProperty({ example: 'Two Sum' })
  @Transform(trim)
  @IsString({ message: 'Problem title is required.' })
  @IsNotEmpty({ message: 'Problem title is required.' })
  title: string;

  @ApiProperty({ example: 'Return the indexes of the two numbers that add up to target.' })
  @Transform(trim)
  @IsString({ message: 'Problem description is required.' })
  @IsNotEmpty({ message: 'Problem description is required.' })
  description: string;

  @ApiProperty({ example: 'twoSum' })
  @Transform(trim)
  @IsString({ message: FN_MSG })
  @Matches(/^[A-Za-z_$][A-Za-z0-9_$]*$/, { message: FN_MSG })
  functionName: string;

  @ApiProperty({ example: 50 })
  @IsInt({ message: POINTS_MSG })
  @Min(1, { message: POINTS_MSG })
  @Max(MAX_POINTS, { message: POINTS_MSG })
  points: number;

  @ApiProperty({ type: [TestCaseDto] })
  @IsArray({ message: 'A problem needs at least 1 sample test case.' })
  @ValidateNested({ each: true })
  @Type(() => TestCaseDto)
  testCases: TestCaseDto[];
}
