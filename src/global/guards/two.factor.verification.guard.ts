import {
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { YOUR_TWO_FACTOR_AUTH_ENDPOINT } from '../routes/external.app.routes';

@Injectable()
export class TwoFactorVerificationGuard {
  private readonly logger = new Logger(TwoFactorVerificationGuard.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async canActivate(
    context: ExecutionContext,
    otp: string,
    userBID: string,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['bidtoken'];

    if (!apiKey) {
      this.logger.error('API key is required.');
      throw new HttpException('API key is required.', 400);
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          YOUR_TWO_FACTOR_AUTH_ENDPOINT,
          { otp, user: userBID },
          {
            headers: {
              Authorization: apiKey,
            },
          },
        ),
      );

      if (!response.data.valid) {
        throw new HttpException('Invalid OTP', 400);
      }

      return true;
    } catch (error) {
      throw error;
    }
  }
}
