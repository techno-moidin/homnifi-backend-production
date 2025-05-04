import { Module } from '@nestjs/common';
import { MyFriendsService } from './myfriends.service';
import { MyFriendsController } from './myfriends.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  MyFriendsProductPurhcaseBonusSetting,
  MyFriendsProductPurhcaseBonusSettingSchema,
} from './schemas/product-purchase-bonus-setting.schema';
import { WalletModule } from '../wallet/wallet.module';
import { MyBlockchainIdModule } from '../my-blockchain-id/my-blockchain-id.module';
import {
  MyFriendsBonusTransaction,
  MyFriendsBonusTransactionSchema,
} from './schemas/bonus-transactions.schema';
import { CacheService } from '../cache/cache.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: MyFriendsProductPurhcaseBonusSetting.name,
        schema: MyFriendsProductPurhcaseBonusSettingSchema,
      },
      {
        name: MyFriendsBonusTransaction.name,
        schema: MyFriendsBonusTransactionSchema,
      },
    ]),
    WalletModule,
    MyBlockchainIdModule,
  ],
  controllers: [MyFriendsController],
  providers: [MyFriendsService, CacheService],
  exports: [MyFriendsService],
})
export class MyFriendsModule {}
