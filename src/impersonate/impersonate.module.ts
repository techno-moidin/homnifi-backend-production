import { Module } from '@nestjs/common';
import { ImpersonateService } from './impersonate.service';
import { ImpersonateController } from './impersonate.controller';
import { AuthService } from '../auth/auth.service';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JWT_SECRET_IMPERSONATE_TOKEN } from '../utils/constants';
import { User, UserSchema } from '../users/schemas/user.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { NotificationModule } from '../notification/notification.module';
import {
  Notification,
  NotificationSchema,
} from '../notification/schemas/notification.schema';
import { EmailModule } from '../email/email.module';
import { EmailService } from '../email/email.service';
import { OtpTokensService } from '../otp-tokens/otp-tokens.service';
import { MyBlockchainIdService } from '../my-blockchain-id/my-blockchain-id.service';
import { DeviceService } from '../device/device.service';
import {
  ImpersonateHistroty,
  ImpersonateHistrotySchema,
} from '../admin/schemas/impersonate-histroty.schema';
import {
  OtpTokens,
  OtpTokensSchema,
} from '../otp-tokens/schemas/otp-tokens.schema';
import { HttpModule, HttpService } from '@nestjs/axios';
import { Device, DeviceSchema } from '../device/schemas/device.schema';
import {
  ImpersonateLog,
  ImpersonateLogSchema,
} from './schemas/impersonate-log.schema';
import { CacheService } from '../cache/cache.service';
import { WalletGatewayService } from '../wallet-gateway/wallet-gateway.service';
import {
  WalletGatewayTransaction,
  WalletGatewayTransactionSchema,
} from '../wallet-gateway/schemas/wallet-gateway.transaction.schema';
import { Wallet, WalletSchema } from '../wallet/schemas/wallet.schema';
import { WalletService } from '../wallet/wallet.service';
import { TokenService } from '../token/token.service';
import {
  WalletTransaction,
  WalletTransactionSchema,
} from '../wallet/schemas/wallet.transaction.schema.';
import {
  WithdrawTransaction,
  WithdrawTransactionSchema,
} from '../wallet/schemas/withdraw.transaction.schema';
import {
  WithdrawSetting,
  WithdrawSettingSchema,
} from '../token/schemas/withdraw.settings.schema';
import {
  CloudKSetting,
  CloudKSettingSchema,
} from '../cloud-k/schemas/cloudk-setting.schema';
import {
  CloudKMachineStake,
  CloudKMachineStakeSchema,
} from '../cloud-k/schemas/cloudk-machine-stakes.schema';
import {
  CloudKMachine,
  CloudKMachineSchema,
} from '../cloud-k/schemas/cloudk-machine.schema';
import {
  OnChainWallet,
  OnChainWalletSchema,
} from '../wallet/schemas/on.chain.wallet.schema';
import { Token, TokenSchema } from '../token/schemas/token.schema';
import {
  TransferTransaction,
  TransferTransactionSchema,
} from '../wallet/schemas/transfer.transaction.schema';
import {
  SwapTransaction,
  SwapTransactionSchema,
} from '../wallet/schemas/swap.transaction.schema';
import {
  SwapTransactionHistory,
  SwapTransactionHistorySchema,
} from '../wallet/schemas/swap.transaction.history.schema';
import {
  SpecialSwapTransaction,
  SpecialSwapTransactionSchema,
} from '../wallet/schemas/special.swap.transaction.schema';
import {
  DepositTransaction,
  DepositTransactionSchema,
} from '../wallet/schemas/deposit.transaction.schema';
import {
  DepositTransactionHistory,
  DepositTransactionHistorySchema,
} from '../wallet/schemas/deposit.history.transaction.schema';
import { Network, NetworkSchema } from '../token/schemas/network.schema';
import {
  DepositSetting,
  DepositSettingSchema,
} from '../token/schemas/deposit.settings.schema';
import { Platform, PlatformSchema } from '../platform/schemas/platform.schema';
import { KMallService } from '../k-mall/kmall.service';
import { GatewayService } from '../gateway/gateway.service';
import {
  WalletSetting,
  WalletSettingSchema,
} from '../wallet/schemas/wallet.settings.schema';
import {
  TrxCounter,
  TrxCounterSchema,
} from '../wallet/schemas/trx-counter.schema';
import { WebhookService } from '../webhook/webhook.service';
import { PlatformService } from '../platform/platform.service';
import { WalletDepositService } from '../wallet/wallet.deposit.service';
import {
  DepositAndStakeTransaction,
  DepositAndStakeTransactionSchema,
} from '../wallet/schemas/depositAndStakeTransaction';
import {
  OnChainWalletSetting,
  OnChainWalletSettingSchema,
} from '../token/schemas/on.chain.wallet.setting.schema';
import {
  WebhookModel,
  WebhookModelSchema,
} from '../webhook/schemas/webhookModel.schema';
import {
  OnChainAttempt,
  OnChainAttemptSchema,
} from '../token/schemas/on.chain.attempt.schema';
import {
  WithdrawSummary,
  WithdrawSummarySchema,
} from '../wallet/schemas/withdraw.summary.schema';
import {
  TokenSetting,
  TokenSettingSchema,
} from '../token/schemas/token.setting.schema';
import {
  SwapSetting,
  SwapSettingSchema,
} from '../token/schemas/swap.settings.schema';
import {
  SpecialSwapSetting,
  SpecialSwapSettingSchema,
} from '../token/schemas/special.swap.settings.schema';
import {
  TokenATHPrice,
  TokenATHPriceSchema,
} from '../token/schemas/token-price.schema';
import {
  DepositAndStakeSettings,
  DepositAndStakeSettingsSchema,
} from '../token/schemas/depositAndStackSettings.schema';
import {
  DepositTransactionSummary,
  DepositTransactionSummarySchema,
} from '../wallet/schemas/deposit.summary.schema';
import {
  PlatformVoucher,
  PlatformVoucherSchema,
} from '../platform-voucher/schemas/platform-voucher.schema';
import {
  EnrolledPlatform,
  EnrolledPlatformSchema,
} from '../platform/schemas/enrolled-platform.schema';
import {
  FavoritePlatform,
  FavoritePlatformSchema,
} from '../platform/schemas/favorite-platform.schema';
import { PlatformAds, PlatformAdsSchema } from '../platform/schemas/ads.schema';
import {
  DepositAndStakeProducts,
  DepositAndStakeProductsSchema,
} from '../wallet/schemas/depositAndStakeProducts';
import {
  CloudKMachineStakeTransaction,
  CloudKMachineStakeTransactionSchema,
} from '../cloud-k/schemas/stake-history.schema';
import {
  SuperNodeGaskSetting,
  SuperNodeGaskSettingSchema,
} from '../supernode/schemas/sn-gask-setting.schema';
import {
  UserGask,
  UserGaskSchema,
} from '../supernode/schemas/user-gask.schema';
import { CloudKService } from '../cloud-k/cloud-k.service';
import { SupernodeService } from '../supernode/supernode.service';
import {
  CloudKSimulationMachine,
  CloudKSimulationMachineSchema,
} from '../cloud-k/schemas/cloudk-simulation-machine.schema';
import {
  CloudKReward,
  CloudKRewardSchema,
} from '../cloud-k/schemas/cloudk-reward.schema';
import {
  CloudKAutoCompoundPenalty,
  CloudKAutoCompoundPenaltySchema,
} from '../cloud-k/schemas/ac-penalty.schema';
import {
  CloudKInflation,
  CloudKInflationSchema,
} from '../cloud-k/schemas/cloudk-inflation.schema';
import {
  CloudKInflationRules,
  CloudKInflationRulesSchema,
} from '../cloud-k/schemas/cloudk-inflation-rules.schema';
import {
  CloudKGlobalAutoCompound,
  CloudKGlobalAutoCompoundSchema,
} from '../cloud-k/schemas/global-autocompound.schema';
import {
  CloudKProduct,
  CloudKProductSchema,
} from '../cloud-k/schemas/cloudk-products.schema';
import {
  CloudKDailyJob,
  CloudKDailyJobSchema,
} from '../cloud-k/schemas/cloudk-reward-job.schema';
import {
  CloudKTransactions,
  CloudKTransactionsSchema,
} from '../cloud-k/schemas/cloudk-transactions.schema';
import {
  CloudKOverrideBoost,
  CloudKOverrideBoostSchema,
} from '../cloud-k/schemas/cloudk-boost-overrirde.schema';
import {
  GlobalPool,
  GlobalPoolSchema,
} from '../supernode/schemas/sn-global-pool.schema';
import {
  CloudKKillSetting,
  CloudKKillSettingSchema,
} from '../cloud-k/schemas/cloudk-kill.schema';
import { MyFriendsService } from '../myfriends/myfriends.service';
import {
  ActiveUserTree,
  ActiveUserTreeSchema,
} from '../users/schemas/active-user-tree.schema';
import {
  MachineCounter,
  MachineCounterSchema,
} from '../cloud-k/schemas/machine-counter.schema';
import { SNGlogbalPollService } from '../supernode/sn-global-poll.service';
import {
  BaseReferralSetting,
  BaseReferralSettingSchema,
} from '../supernode/schemas/base-referral-setting.schema';
import {
  BaseReferralLevelSchema,
  BaseReferralLevelSetting,
} from '../supernode/schemas/base-referral-level-settings.schema';
import {
  SNBonusTransaction,
  SNBonusTransactionSchema,
} from '../supernode/schemas/sn-bonus-transaction.schema';
import {
  UserRewards,
  UserRewardsSchema,
} from '../supernode/schemas/user-rewards.schema';
import {
  SnSetting,
  SnSettingSchema,
} from '../supernode/schemas/sn-settings.schema';
import {
  BuilderGenerationSetting,
  BuilderGenerationSettingSchema,
} from '../supernode/schemas/builder-generation-settings';
import {
  BuilderGenerationLevelSetting,
  BuilderGenerationLevelSettingSchema,
} from '../supernode/schemas/builder-generation-level-settings.schema';
import {
  BuilderReferralSetting,
  BuilderReferralSettingSchema,
} from '../supernode/schemas/builder-referral-settings.schema';
import { Sngp, SngpSchema } from '../supernode/schemas/sngp.schema';
import {
  UserSngp,
  UserSngpSchema,
} from '../supernode/schemas/user-sngp.schema';
import {
  SngpRewards,
  SngpRewardsSchema,
} from '../supernode/schemas/sngp-rewards.schema';
import {
  SngpDistribution,
  SngpDistributionSchema,
} from '../supernode/schemas/sngp-distribution.schema';
import {
  MyFriendsBonusTransaction,
  MyFriendsBonusTransactionSchema,
} from '../myfriends/schemas/bonus-transactions.schema';
import {
  MyFriendsProductPurhcaseBonusSetting,
  MyFriendsProductPurhcaseBonusSettingSchema,
} from '../myfriends/schemas/product-purchase-bonus-setting.schema';
import { SupernodeSummaryService } from '../supernode/supernode.summary.service';
import {
  CloudKAutoCompoundSetting,
  CloudKAutoCompoundSettingSchema,
} from '../cloud-k/schemas/cloudk-autoCompound-setting.schema';
import {
  MembershipWebhookModel,
  MembershipWebhookModelSchema,
} from '../webhook/schemas/membershipWebhookModel.schema';
import { TwoAccessService } from '../two-access/two-access.service';
import {
  AdditionalMintingPromotion,
  AdditionalMintingPromotionSchema,
} from '../admin/schemas/additional-minting-promotion.schema';
import {
  GenExtraRewardHistory,
  GenExtraRewardHistorySchema,
} from '../cloud-k/schemas/gen-extra-reward-history.schema';
import {
  UserTeamMachineStakes,
  UserTeamMachineStakesSchema,
} from '../supernode/schemas/user-team-machine-stacks.schema';
import {
  AdditionalCountryLevelSetting,
  AdditionalCountryLevelSettingSchema,
} from '../admin/schemas/additional.product.minting.Schema';
import {
  InactiveAdditionalCountryLevelSetting,
  InactiveAdditionalCountryLevelSettingSchema,
} from '../admin/schemas/inactive-additional.product.minting.Schema';

import {
  UsdkStakeSettings,
  UsdkStakeSettingsSchema,
} from '../usdk-stake/schemas/usdkStakeSettings.schema';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>(JWT_SECRET_IMPERSONATE_TOKEN),
        signOptions: { expiresIn: '24h' },
      }),
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: ImpersonateHistroty.name, schema: ImpersonateHistrotySchema },
      {
        name: ImpersonateLog.name,
        schema: ImpersonateLogSchema,
      },
      { name: OtpTokens.name, schema: OtpTokensSchema },
      { name: Device.name, schema: DeviceSchema },
      { name: Wallet.name, schema: WalletSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
      { name: WithdrawTransaction.name, schema: WithdrawTransactionSchema },
      { name: WithdrawSetting.name, schema: WithdrawSettingSchema },
      { name: CloudKSetting.name, schema: CloudKSettingSchema },
      { name: CloudKMachineStake.name, schema: CloudKMachineStakeSchema },
      { name: CloudKMachine.name, schema: CloudKMachineSchema },
      { name: OnChainWallet.name, schema: OnChainWalletSchema },
      { name: Token.name, schema: TokenSchema },
      { name: TransferTransaction.name, schema: TransferTransactionSchema },
      { name: SwapTransaction.name, schema: SwapTransactionSchema },
      { name: DepositTransaction.name, schema: DepositTransactionSchema },
      { name: Network.name, schema: NetworkSchema },
      { name: DepositSetting.name, schema: DepositSettingSchema },
      { name: Platform.name, schema: PlatformSchema },
      { name: WalletSetting.name, schema: WalletSettingSchema },
      { name: TrxCounter.name, schema: TrxCounterSchema },
      { name: OnChainWalletSetting.name, schema: OnChainWalletSettingSchema },
      { name: OnChainAttempt.name, schema: OnChainAttemptSchema },
      { name: WithdrawSummary.name, schema: WithdrawSummarySchema },
      { name: TokenSetting.name, schema: TokenSettingSchema },
      { name: SwapSetting.name, schema: SwapSettingSchema },
      { name: SpecialSwapSetting.name, schema: SpecialSwapSettingSchema },
      { name: TokenATHPrice.name, schema: TokenATHPriceSchema },
      { name: PlatformVoucher.name, schema: PlatformVoucherSchema },
      { name: EnrolledPlatform.name, schema: EnrolledPlatformSchema },
      { name: FavoritePlatform.name, schema: FavoritePlatformSchema },
      { name: PlatformAds.name, schema: PlatformAdsSchema },
      { name: SuperNodeGaskSetting.name, schema: SuperNodeGaskSettingSchema },
      { name: UserGask.name, schema: UserGaskSchema },
      { name: CloudKReward.name, schema: CloudKRewardSchema },
      { name: CloudKInflation.name, schema: CloudKInflationSchema },
      { name: CloudKInflationRules.name, schema: CloudKInflationRulesSchema },
      { name: CloudKProduct.name, schema: CloudKProductSchema },
      { name: CloudKDailyJob.name, schema: CloudKDailyJobSchema },
      { name: CloudKTransactions.name, schema: CloudKTransactionsSchema },
      { name: CloudKOverrideBoost.name, schema: CloudKOverrideBoostSchema },
      { name: GlobalPool.name, schema: GlobalPoolSchema },
      { name: CloudKKillSetting.name, schema: CloudKKillSettingSchema },
      { name: ActiveUserTree.name, schema: ActiveUserTreeSchema },
      { name: MachineCounter.name, schema: MachineCounterSchema },
      { name: BaseReferralSetting.name, schema: BaseReferralSettingSchema },
      { name: SNBonusTransaction.name, schema: SNBonusTransactionSchema },
      { name: UserRewards.name, schema: UserRewardsSchema },
      { name: SnSetting.name, schema: SnSettingSchema },
      { name: Sngp.name, schema: SngpSchema },
      { name: UserSngp.name, schema: UserSngpSchema },
      { name: SngpDistribution.name, schema: SngpDistributionSchema },
      { name: SngpRewards.name, schema: SngpRewardsSchema },
      {
        name: MyFriendsProductPurhcaseBonusSetting.name,
        schema: MyFriendsProductPurhcaseBonusSettingSchema,
      },
      {
        name: MyFriendsBonusTransaction.name,
        schema: MyFriendsBonusTransactionSchema,
      },
      {
        name: BuilderReferralSetting.name,
        schema: BuilderReferralSettingSchema,
      },
      {
        name: BuilderGenerationLevelSetting.name,
        schema: BuilderGenerationLevelSettingSchema,
      },
      {
        name: BuilderGenerationSetting.name,
        schema: BuilderGenerationSettingSchema,
      },
      {
        name: BaseReferralLevelSetting.name,
        schema: BaseReferralLevelSchema,
      },
      {
        name: CloudKGlobalAutoCompound.name,
        schema: CloudKGlobalAutoCompoundSchema,
      },
      {
        name: CloudKAutoCompoundPenalty.name,
        schema: CloudKAutoCompoundPenaltySchema,
      },
      {
        name: CloudKSimulationMachine.name,
        schema: CloudKSimulationMachineSchema,
      },
      {
        name: CloudKMachineStakeTransaction.name,
        schema: CloudKMachineStakeTransactionSchema,
      },
      {
        name: DepositAndStakeProducts.name,
        schema: DepositAndStakeProductsSchema,
      },
      {
        name: DepositTransactionSummary.name,
        schema: DepositTransactionSummarySchema,
      },
      {
        name: DepositAndStakeSettings.name,
        schema: DepositAndStakeSettingsSchema,
      },
      {
        name: DepositAndStakeTransaction.name,
        schema: DepositAndStakeTransactionSchema,
      },
      {
        name: DepositTransactionHistory.name,
        schema: DepositTransactionHistorySchema,
      },
      {
        name: SpecialSwapTransaction.name,
        schema: SpecialSwapTransactionSchema,
      },
      {
        name: SwapTransactionHistory.name,
        schema: SwapTransactionHistorySchema,
      },
      {
        name: WalletGatewayTransaction.name,
        schema: WalletGatewayTransactionSchema,
      },
      {
        name: CloudKAutoCompoundSetting.name,
        schema: CloudKAutoCompoundSettingSchema,
      },
      {
        name: AdditionalMintingPromotion.name,
        schema: AdditionalMintingPromotionSchema,
      },
      {
        name: GenExtraRewardHistory.name,
        schema: GenExtraRewardHistorySchema,
      },
      {
        name: UserTeamMachineStakes.name,
        schema: UserTeamMachineStakesSchema,
      },
      {
        name: AdditionalCountryLevelSetting.name,
        schema: AdditionalCountryLevelSettingSchema,
      },
      {
        name: InactiveAdditionalCountryLevelSetting.name,
        schema: InactiveAdditionalCountryLevelSettingSchema,
      },
      { name: UsdkStakeSettings.name, schema: UsdkStakeSettingsSchema },
    ]),
    MongooseModule.forFeature(
      [
        {
          name: WebhookModel.name,
          schema: WebhookModelSchema,
        },
        {
          name: MembershipWebhookModel.name,
          schema: MembershipWebhookModelSchema,
        },
      ],
      'webhook',
    ),
    UsersModule,
    NotificationModule,
    EmailModule,
    HttpModule,
  ],
  controllers: [ImpersonateController],
  providers: [
    ImpersonateService,
    AuthService,
    EmailService,
    OtpTokensService,
    MyBlockchainIdService,
    DeviceService,
    CacheService,
    WalletGatewayService,
    WalletService,
    TokenService,
    KMallService,
    GatewayService,
    WebhookService,
    PlatformService,
    WalletDepositService,
    CloudKService,
    SupernodeService,
    MyFriendsService,
    SNGlogbalPollService,
    SupernodeSummaryService,
    TwoAccessService,
  ],
})
export class ImpersonateModule {}
