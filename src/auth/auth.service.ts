import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../common/email.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  private async hashData(data: string) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(data, salt);
  }

  async register(email: string, password: string) {
    const existing = await this.usersService.findByEmail(email);
    if (existing) throw new ConflictException('Email already registered');

    const hashed = await this.hashData(password);
    const verificationToken = (Math.random().toString(36).slice(2) + Date.now().toString(36));

    const user = await this.usersService.create({
      email,
      password: hashed,
      emailVerificationToken: verificationToken,
    });

    // publish user.created event for async processing (email, analytics, etc.)
    try {
      // publish to RabbitMQ (app.events topic)
      // payload intentionally small to avoid leaking sensitive data
      const payload = { id: user._id.toString(), email: user.email, emailVerificationToken: verificationToken, createdAt: user.createdAt };
      await import('../common/messaging').then((m) => m.publish('user.created', payload));
    } catch (err) {
      // don't fail registration on pubsub errors, but log
      console.error('Failed to publish user.created event', err);
    }

    return { id: user._id, email: user.email };
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return null;
    return user;
  }

  async login(user: any) {
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: user._id.toString(), email: user.email, roles: user.roles };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('jwt.accessTokenSecret'),
      expiresIn: this.configService.get<string>('jwt.accessTokenExpiration'),
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('jwt.refreshTokenSecret'),
      expiresIn: this.configService.get<string>('jwt.refreshTokenExpiration'),
    });

    const hashedRefresh = await this.hashData(refreshToken);
    await this.usersService.setRefreshToken(user._id, hashedRefresh);

    return { accessToken, refreshToken };
  }

  async logout(userId: string) {
    await this.usersService.setRefreshToken(userId, null);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, { secret: this.configService.get<string>('jwt.refreshTokenSecret') });
      const userId = payload.sub;
      const user = await this.usersService.findById(userId);
      if (!user || !user.refreshToken) throw new UnauthorizedException('Invalid refresh token');
      const matches = await bcrypt.compare(refreshToken, user.refreshToken);
      if (!matches) throw new UnauthorizedException('Invalid refresh token');

      // issue new tokens
      const newPayload = { sub: user._id.toString(), email: user.email, roles: user.roles };
      const newAccess = await this.jwtService.signAsync(newPayload, {
        secret: this.configService.get<string>('jwt.accessTokenSecret'),
        expiresIn: this.configService.get<string>('jwt.accessTokenExpiration'),
      });

      const newRefresh = await this.jwtService.signAsync(newPayload, {
        secret: this.configService.get<string>('jwt.refreshTokenSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshTokenExpiration'),
      });

      const hashed = await this.hashData(newRefresh);
      await this.usersService.setRefreshToken(userId, hashed);

      return { accessToken: newAccess, refreshToken: newRefresh };
    } catch (err) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async verifyEmail(token: string) {
    // find user by token
    const user = await this.usersService['userModel'].findOne({ emailVerificationToken: token });
    if (!user) throw new UnauthorizedException('Invalid token');
    await this.usersService.markEmailVerified(user._id);
    return { ok: true };
  }
}
