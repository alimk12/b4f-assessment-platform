import { ConflictException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './jwt-payload.interface';

const toUser = (u: User) => ({ id: u.id, fullName: u.fullName, email: u.email, role: u.role });

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async register(dto: RegisterDto) {
    const taken = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (taken) throw new ConflictException('An account with this email already exists.');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { fullName: dto.fullName, email: dto.email, passwordHash, role: 'STUDENT' },
    });
    this.logger.log(`User registered: ${user.id}`);
    return this.authResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      this.logger.warn('Login failed');
      throw new UnauthorizedException('Invalid email or password.');
    }
    return this.authResponse(user);
  }

  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');
    return toUser(user);
  }

  private async authResponse(user: User) {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    return { accessToken: await this.jwt.signAsync(payload), user: toUser(user) };
  }
}
