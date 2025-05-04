import { Module } from '@nestjs/common';
import { TokenService } from './token.service';
import { TokenController } from './token.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Token, TokenSchema } from './schemas/token.schema';
import {
  TokenSetting,
  TokenSettingSchema,
} from './schemas/token.setting.schema';
import {
  CommunityTrxSetting,
  CommunityTrxSettingSchema,
} from './schemas/community.trx.settting.schema';
import { Network, NetworkSchema } from './schemas/network.schema';
import {
  DepositSetting,
  DepositSettingSchema,
} from './schemas/deposit.settings.schema';
import {
  WithdrawSetting,
  WithdrawSettingSchema,
} from './schemas/withdraw.settings.schema';
import { SwapSetting, SwapSettingSchema } from './schemas/swap.settings.schema';
import {
  TokenATHPrice,
  TokenATHPriceSchema,
} from './schemas/token-price.schema';
import { CloudKService } from '../cloud-k/cloud-k.service';
import { CloudKModule } from '../cloud-k/cloud-k.module';
import { HttpModule } from '@nestjs/axios';
import {
  WalletTransaction,
  WalletTransactionSchema,
} from '../wallet/schemas/wallet.transaction.schema.';
import {
  DepositTransaction,
  DepositTransactionSchema,
} from '../wallet/schemas/deposit.transaction.schema';
import {
  WithdrawTransaction,
  WithdrawTransactionSchema,
} from '../wallet/schemas/withdraw.transaction.schema';
import {
  SwapTransaction,
  SwapTransactionSchema,
} from '../wallet/schemas/swap.transaction.schema';
import {
  DepositAndStakeSettings,
  DepositAndStakeSettingsSchema,
} from './schemas/depositAndStackSettings.schema';
import { Platform, PlatformSchema } from '../platform/schemas/platform.schema';
import {
  SpecialSwapSetting,
  SpecialSwapSettingSchema,
} from '@/src/token/schemas/special.swap.settings.schema';
import {
  OnChainWalletSetting,
  OnChainWalletSettingSchema,
} from './schemas/on.chain.wallet.setting.schema';
import {
  DepositTransactionSummary,
  DepositTransactionSummarySchema,
} from '../wallet/schemas/deposit.summary.schema';
import {
  WithdrawSummary,
  WithdrawSummarySchema,
} from '../wallet/schemas/withdraw.summary.schema';
import { CacheService } from '../cache/cache.service';
import {
  OnChainAttempt,
  OnChainAttemptSchema,
} from './schemas/on.chain.attempt.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Token.name, schema: TokenSchema },
      { name: TokenSetting.name, schema: TokenSettingSchema },
      { name: CommunityTrxSetting.name, schema: CommunityTrxSettingSchema },
      { name: Network.name, schema: NetworkSchema },
      { name: DepositSetting.name, schema: DepositSettingSchema },
      { name: WithdrawSetting.name, schema: WithdrawSettingSchema },
      { name: SwapSetting.name, schema: SwapSettingSchema },
      { name: SpecialSwapSetting.name, schema: SpecialSwapSettingSchema },
      { name: TokenATHPrice.name, schema: TokenATHPriceSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
      { name: DepositTransaction.name, schema: DepositTransactionSchema },
      { name: WithdrawTransaction.name, schema: WithdrawTransactionSchema },
      { name: SwapTransaction.name, schema: SwapTransactionSchema },
      { name: OnChainWalletSetting.name, schema: OnChainWalletSettingSchema },
      {
        name: OnChainAttempt.name,
        schema: OnChainAttemptSchema,
      },
      {
        name: DepositAndStakeSettings.name,
        schema: DepositAndStakeSettingsSchema,
      },
      {
        name: Platform.name,
        schema: PlatformSchema,
      },
      {
        name: DepositTransactionSummary.name,
        schema: DepositTransactionSummarySchema,
      },
      {
        name: WithdrawSummary.name,
        schema: WithdrawSummarySchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
    HttpModule,
  ],
  controllers: [TokenController],
  providers: [TokenService, CacheService],
  exports: [TokenService],
})
export class TokenModule {}
