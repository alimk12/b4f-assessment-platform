import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './jwt-payload.interface';
import { SessionService } from './session.service';

export const MSG_EMAIL_TAKEN = 'An account with this email already exists.';
export const MSG_ACCOUNT_DISABLED = 'This account is disabled. Please contact your instructor.';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly sessions: SessionService,
  ) {}

  /** The public User shape (API.md §20.4). `passwordHash` is never returned. */
  async toUser(u: User) {
    const cohort = u.cohortId
      ? await this.prisma.cohort.findUnique({ where: { id: u.cohortId }, include: { city: true } })
      : null;
    return {
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      cohort: cohort ? { id: cohort.id, name: cohort.name, city: cohort.city.name, status: cohort.status } : null,
    };
  }

  async register(dto: RegisterDto) {
    const cohort = await this.prisma.cohort.findUnique({ where: { joinCode: dto.joinCode } });
    if (!cohort) throw new BadRequestException('This cohort code is not valid.');
    if (cohort.status === 'ARCHIVED') throw new BadRequestException('This cohort is closed for new sign-ups.');
    const taken = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (taken) throw new ConflictException(MSG_EMAIL_TAKEN);
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const { user, sid } = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { fullName: dto.fullName, email: dto.email, passwordHash, role: 'STUDENT', cohortId: cohort.id },
      });
      return { user, sid: await this.sessions.create(tx, user.id, user.role) };
    });
    this.logger.log(`User registered: ${user.id} (cohort ${cohort.id})`);
    return this.authResponse(user, sid);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      this.logger.warn('Login failed');
      throw new UnauthorizedException('Invalid email or password.');
    }
    if (!user.isActive) {
      this.logger.warn(`Login refused, account disabled: ${user.id}`);
      throw new ForbiddenException(MSG_ACCOUNT_DISABLED);
    }
    // A student's new sign-in ends their other sessions in the same transaction (A-9).
    const sid = await this.prisma.$transaction((tx) => this.sessions.create(tx, user.id, user.role));
    return this.authResponse(user, sid);
  }

  async logout(user: JwtPayload) {
    await this.sessions.revoke(user.sid, 'LOGOUT');
  }

  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');
    const base = await this.toUser(user);
    if (user.role !== 'INSTRUCTOR') return { ...base, cohorts: null };
    const links = await this.prisma.cohortInstructor.findMany({
      where: { userId },
      include: { cohort: { include: { city: true } } },
      orderBy: [{ cohort: { status: 'asc' } }, { cohort: { createdAt: 'desc' } }],
    });
    return {
      ...base,
      cohorts: links.map((l) => ({ id: l.cohort.id, name: l.cohort.name, city: l.cohort.city.name, status: l.cohort.status })),
    };
  }

  private async authResponse(user: User, sid: number) {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role, sid };
    return { accessToken: await this.jwt.signAsync(payload), user: await this.toUser(user) };
  }
}
