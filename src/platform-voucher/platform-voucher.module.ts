import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PlatformVoucherService } from './platform-voucher.service';
import { PlatformVoucherController } from './platform-voucher.controller';
import {
  PlatformVoucher,
  PlatformVoucherSchema,
} from './schemas/platform-voucher.schema';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PlatformVoucher.name, schema: PlatformVoucherSchema },
    ]),
  ],
  controllers: [PlatformVoucherController],
  providers: [PlatformVoucherService],
})
export class PlatformVoucherModule {}
