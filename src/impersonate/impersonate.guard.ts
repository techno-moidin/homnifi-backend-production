import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import {
  JWT_SECRET_ADMIN,
  JWT_SECRET_IMPERSONATE_TOKEN,
} from '@/src/utils/constants';
import { ConfigService } from '@nestjs/config';
import { AdminJWTPayload } from '@/src/interface/admin-jwt-playload';
import { Model } from 'mongoose';
import { AuthService } from '../auth/auth.service';
import { IMPERSONALTE_STATUS } from '../admin/schemas/impersonate-histroty.schema';

@Injectable()
export class ImpersonateGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private adminService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private module = null;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: any = context.switchToHttp().getRequest();

    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }
    try {
      const payload: any = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>(JWT_SECRET_IMPERSONATE_TOKEN),
      });

      const impersonate: any = await this.adminService.getImpersonate(
        payload.id,
      );
      if (
        !impersonate ||
        impersonate.status === IMPERSONALTE_STATUS.LOGGED_IN
      ) {
        throw new BadRequestException();
      }
      request.impersonate = impersonate;
      request.impersonateId = impersonate._id;
    } catch (e) {
      if (e instanceof UnauthorizedException) {
        throw e;
      }
      throw new ForbiddenException();
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
