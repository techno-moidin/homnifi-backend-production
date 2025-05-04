import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { TwoFAService } from '../admin-2fa.service';
import { JwtService } from '@nestjs/jwt';
import { AdminJWTPayload } from '@/src/interface/admin-jwt-playload';
import { ConfigService } from '@nestjs/config';
import { JWT_SECRET_ADMIN } from '@/src/utils/constants';
import { AdminService } from '../../admin.service';
import { Request } from 'express';

@Injectable()
export class TFAGuard implements CanActivate {
  private messageVerifiedFailed: string = '2FA verification failed';
  constructor(
    private tfaService: TwoFAService,
    private jwtService: JwtService,
    private readonly configService: ConfigService,
    private adminService: AdminService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: any = context.switchToHttp().getRequest();

    const token = this.extractTokenFromHeader(request);
    if (!request.body.otp) {
      throw new UnprocessableEntityException('OTP Missing');
    }

    if (!token) {
      throw new UnauthorizedException();
    }
    try {
      const payload: AdminJWTPayload = await this.jwtService.verifyAsync(
        token,
        {
          secret: this.configService.get<string>(JWT_SECRET_ADMIN),
        },
      );

      const admin: any = await this.adminService.findById(payload.id);
      if (!admin) {
        throw new UnauthorizedException('Admin not found');
      }
      if (process.env.NODE_ENV !== 'qa-server') {
        const tfaVerify = await this.tfaService.verify2Fa(
          request.body.otp,
          admin.TFASecret,
        );
        if (!tfaVerify) {
          throw new UnprocessableEntityException(this.messageVerifiedFailed);
        }
      }
      if (
        process.env.NODE_ENV === 'qa-server' &&
        request.body.otp !== '123456'
      ) {
        throw new UnprocessableEntityException(this.messageVerifiedFailed);
      }

      return true;
    } catch (e) {
      if (e instanceof UnauthorizedException) {
        console.error('Unauthorized exception');
        throw e;
      }
      if (e instanceof UnprocessableEntityException) {
        throw e;
      }
      throw new ForbiddenException('Unauthorized exception ..');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
