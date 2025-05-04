import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { TwoFactorVerificationGuard } from './two.factor.verification.guard';
import { UsersService } from '@/src/users/users.service';

@Injectable()
export class OTPGuard implements CanActivate {
  constructor(
    @Inject(forwardRef(() => TwoFactorVerificationGuard))
    private readonly twoFactorVerificationGuard: TwoFactorVerificationGuard,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user.userId;
    const user = await this.usersService.findUserById(userId);
    const userBid = (await user).blockchainId;
    const otp = request.body.otp;

    if (!userBid || !otp) {
      return false;
    }

    return await this.twoFactorVerificationGuard.canActivate(
      context,
      otp,
      userBid,
    );
  }
}
