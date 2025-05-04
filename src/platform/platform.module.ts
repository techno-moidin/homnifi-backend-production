import { Module } from '@nestjs/common';
import { PlatformService } from './platform.service';
import { PlatformController } from './platform.controller';
import { Platform, PlatformSchema } from './schemas/platform.schema';
import { MongooseModule } from '@nestjs/mongoose';
import {
  EnrolledPlatform,
  EnrolledPlatformSchema,
} from './schemas/enrolled-platform.schema';
import {
  FavoritePlatform,
  FavoritePlatformSchema,
} from './schemas/favorite-platform.schema';
import { PlatformAds, PlatformAdsSchema } from './schemas/ads.schema';
import { Network, NetworkSchema } from '../token/schemas/network.schema';
import {
  PlatformVoucher,
  PlatformVoucherSchema,
} from '../platform-voucher/schemas/platform-voucher.schema';
import { HttpModule, HttpService } from '@nestjs/axios';
import axios, { Axios } from 'axios';
import { KMallService } from '../k-mall/kmall.service';
import { KMallModule } from '../k-mall/kmall.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Platform.name,
        schema: PlatformSchema,
      },
      {
        name: EnrolledPlatform.name,
        schema: EnrolledPlatformSchema,
      },
      {
        name: FavoritePlatform.name,
        schema: FavoritePlatformSchema,
      },
      { name: PlatformAds.name, schema: PlatformAdsSchema },
    ]),
    KMallModule,
  ],
  providers: [PlatformService],
  controllers: [PlatformController],
  exports: [PlatformService],
})
export class PlatformModule {}
