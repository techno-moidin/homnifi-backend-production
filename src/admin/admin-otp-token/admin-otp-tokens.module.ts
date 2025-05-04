import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AdminOtpTokens,
  AdminOtpTokensSchema,
} from './schemas/admin-otp-tokens.schema';
import { Admin, AdminSchema } from '../schemas/admin.schema';
import { AdminOtpTokensService } from './admin-otp-tokens.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AdminOtpTokens.name, schema: AdminOtpTokensSchema },
      { name: Admin.name, schema: AdminSchema },
    ]),
  ],
  providers: [AdminOtpTokensService, AdminOtpTokens],
  exports: [AdminOtpTokensService],
})
export class AdminOtpTokensModule {}
