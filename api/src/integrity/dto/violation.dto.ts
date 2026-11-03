import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const CLIENT_VIOLATION_TYPES = ['FULLSCREEN_EXIT', 'TAB_HIDDEN', 'COPY', 'CUT', 'PASTE_EXTERNAL', 'DROP_EXTERNAL'] as const;
export type ClientViolationType = (typeof CLIENT_VIOLATION_TYPES)[number];

export class ViolationDto {
  @ApiProperty({ enum: CLIENT_VIOLATION_TYPES, example: 'FULLSCREEN_EXIT' })
  @IsIn(CLIENT_VIOLATION_TYPES as unknown as string[], { message: 'Unknown violation type.' })
  type: ClientViolationType;
}
