import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Type,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class WebhookGuardBase implements CanActivate {
  constructor(private readonly envKey: string) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiSecret = request.headers['x-api-key'];

    if (!apiSecret || apiSecret !== process.env[this.envKey]) {
      throw new UnauthorizedException('Invalid API Key');
    }

    return true;
  }
}

export function WebhookGuard(envKey: string): Type<WebhookGuardBase> {
  @Injectable()
  class CustomApiKeyAuthGuard extends WebhookGuardBase {
    constructor() {
      super(envKey);
    }
  }
  return CustomApiKeyAuthGuard;
}
