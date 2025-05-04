import { Module } from '@nestjs/common';
import { WalletGatewayService } from './wallet-gateway.service';
import { WalletGatewayController } from './wallet-gateway.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  WalletGatewayTransaction,
  WalletGatewayTransactionSchema,
} from './schemas/wallet-gateway.transaction.schema';
import { Wallet, WalletSchema } from '../wallet/schemas/wallet.schema';
import { UsersModule } from '../users/users.module';
import { WalletModule } from '../wallet/wallet.module';
import {
  WalletTransaction,
  WalletTransactionSchema,
} from '../wallet/schemas/wallet.transaction.schema.';
import { TokenService } from '../token/token.service';
import { Token, TokenSchema } from '../token/schemas/token.schema';
import {
  TokenSetting,
  TokenSettingSchema,
} from '../token/schemas/token.setting.schema';
import { Network, NetworkSchema } from '../token/schemas/network.schema';
import {
  SwapSetting,
  SwapSettingSchema,
} from '../token/schemas/swap.settings.schema';
import {
  DepositSetting,
  DepositSettingSchema,
} from '../token/schemas/deposit.settings.schema';
import {
  WithdrawSetting,
  WithdrawSettingSchema,
} from '../token/schemas/withdraw.settings.schema';
import {
  TokenATHPrice,
  TokenATHPriceSchema,
} from '../token/schemas/token-price.schema';
import { HttpModule } from '@nestjs/axios';

import {
  WithdrawTransaction,
  WithdrawTransactionSchema,
} from '../wallet/schemas/withdraw.transaction.schema';
import {
  DepositTransaction,
  DepositTransactionSchema,
} from '../wallet/schemas/deposit.transaction.schema';
import {
  SwapTransaction,
  SwapTransactionSchema,
} from '../wallet/schemas/swap.transaction.schema';
import { DepositAndStakeSettings } from '../token/schemas/depositAndStackSettings.schema';
import { Platform, PlatformSchema } from '../platform/schemas/platform.schema';
import {
  SpecialSwapSetting,
  SpecialSwapSettingSchema,
} from '@/src/token/schemas/special.swap.settings.schema';
import {
  SpecialSwapTransaction,
  SpecialSwapTransactionSchema,
} from '@/src/wallet/schemas/special.swap.transaction.schema';
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
  OnChainWalletSetting,
  OnChainWalletSettingSchema,
} from '../token/schemas/on.chain.wallet.setting.schema';
import {
  OnChainAttempt,
  OnChainAttemptSchema,
} from '../token/schemas/on.chain.attempt.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: WalletGatewayTransaction.name,
        schema: WalletGatewayTransactionSchema,
      },
      { name: Wallet.name, schema: WalletSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
      { name: WithdrawTransaction.name, schema: WithdrawTransactionSchema },
      { name: WithdrawSetting.name, schema: WithdrawSettingSchema },
      { name: Token.name, schema: TokenSchema },
      { name: TokenSetting.name, schema: TokenSettingSchema },
      { name: Network.name, schema: NetworkSchema },
      { name: SwapSetting.name, schema: SwapSettingSchema },
      { name: SpecialSwapSetting.name, schema: SpecialSwapSettingSchema },
      { name: DepositSetting.name, schema: DepositSettingSchema },
      { name: TokenATHPrice.name, schema: TokenATHPriceSchema },
      { name: DepositTransaction.name, schema: DepositTransactionSchema },
      { name: SwapTransaction.name, schema: SwapTransactionSchema },
      { name: DepositAndStakeSettings.name, schema: SwapTransactionSchema },
      { name: Platform.name, schema: PlatformSchema },
      {
        name: SpecialSwapTransaction.name,
        schema: SpecialSwapTransactionSchema,
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
        name: OnChainWalletSetting.name,
        schema: OnChainWalletSettingSchema,
      },
      {
        name: OnChainAttempt.name,
        schema: OnChainAttemptSchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
    HttpModule,
    UsersModule,
    WalletModule,
  ],
  controllers: [WalletGatewayController],
  providers: [WalletGatewayService, TokenService, CacheService],
})
export class WalletGatewayModule {
  //
}
