import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { KMallService } from './kmall.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Network, NetworkSchema } from '../token/schemas/network.schema';
import {
  PlatformVoucher,
  PlatformVoucherSchema,
} from '../platform-voucher/schemas/platform-voucher.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Network.name, schema: NetworkSchema },
      { name: User.name, schema: UserSchema },
      { name: PlatformVoucher.name, schema: PlatformVoucherSchema },
    ]),
    HttpModule,
  ],
  providers: [KMallService],
  exports: [KMallService],
})
export class KMallModule {}
