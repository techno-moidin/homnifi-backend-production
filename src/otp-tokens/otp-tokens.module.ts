import { Module } from '@nestjs/common';
import { OtpTokensService } from './otp-tokens.service';
import { OtpTokens, OtpTokensSchema } from './schemas/otp-tokens.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OtpTokens.name, schema: OtpTokensSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [OtpTokensService, OtpTokens],
  exports: [OtpTokensService],
})
export class OtpTokensModule {}
