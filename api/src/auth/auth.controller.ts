import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtPayload } from './jwt-payload.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @ApiOperation({ summary: 'Student sign-up with the cohort join code (the role is always STUDENT)' })
  @ApiResponse({ status: 201, description: 'Signed up and signed in' })
  @ApiResponse({ status: 400, description: 'Invalid input, unknown or closed cohort code' })
  @ApiResponse({ status: 409, description: 'Email already used' })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @ApiOperation({ summary: 'Sign in and receive a JWT. A student\'s other sessions are ended.' })
  @ApiResponse({ status: 200, description: 'Signed in' })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  @ApiResponse({ status: 403, description: 'Account disabled' })
  @HttpCode(200)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @ApiOperation({ summary: 'End the current session' })
  @ApiResponse({ status: 204, description: 'Signed out' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  @Post('logout')
  async logout(@CurrentUser() user: JwtPayload) {
    await this.auth.logout(user);
  }

  @ApiOperation({ summary: 'The signed-in user (with the cohort of a student or the cohorts of an instructor)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return this.auth.getMe(user.sub);
  }
}
