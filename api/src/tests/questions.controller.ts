import { Body, Controller, Delete, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { CohortAccessService } from '../common/cohort-access.service';
import { QuestionIdParamDto, TestIdParamDto } from '../common/dto/id-param.dto';
import { QuestionDto } from './dto/question.dto';
import { QuestionsService } from './questions.service';

@ApiTags('instructor-content')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('INSTRUCTOR', 'ADMIN')
@Controller('instructor')
export class QuestionsController {
  constructor(private readonly questions: QuestionsService, private readonly access: CohortAccessService) {}

  @ApiOperation({ summary: 'Add an MCQ question (2–6 options, exactly one correct)' })
  @Post('tests/:testId/questions')
  async createQuestion(@Param() p: TestIdParamDto, @Body() dto: QuestionDto, @CurrentUser() user: JwtPayload) {
    await this.access.assertTest(user, p.testId);
    return this.questions.create(p.testId, dto);
  }

  @ApiOperation({ summary: 'Replace an MCQ question and all its options' })
  @Put('questions/:questionId')
  async replaceQuestion(@Param() p: QuestionIdParamDto, @Body() dto: QuestionDto, @CurrentUser() user: JwtPayload) {
    await this.access.assertQuestion(user, p.questionId);
    return this.questions.replace(p.questionId, dto);
  }

  @ApiOperation({ summary: 'Delete an MCQ question' })
  @Delete('questions/:questionId')
  async deleteQuestion(@Param() p: QuestionIdParamDto, @CurrentUser() user: JwtPayload) {
    await this.access.assertQuestion(user, p.questionId);
    return this.questions.remove(p.questionId);
  }
}
