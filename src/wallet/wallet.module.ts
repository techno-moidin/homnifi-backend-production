import { forwardRef, Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Wallet, WalletSchema } from './schemas/wallet.schema';
import {
  WalletTransaction,
  WalletTransactionSchema,
} from './schemas/wallet.transaction.schema.';
import {
  DepositTransaction,
  DepositTransactionSchema,
} from './schemas/deposit.transaction.schema';
import {
  SwapTransaction,
  SwapTransactionSchema,
} from './schemas/swap.transaction.schema';
import {
  WithdrawTransaction,
  WithdrawTransactionSchema,
} from './schemas/withdraw.transaction.schema';
import {
  TransferTransaction,
  TransferTransactionSchema,
} from './schemas/transfer.transaction.schema';
import { KMallModule } from '../k-mall/kmall.module';
import { Token, TokenSchema } from '../token/schemas/token.schema';
import {
  OnChainWallet,
  OnChainWalletSchema,
} from './schemas/on.chain.wallet.schema';
import { Network, NetworkSchema } from '../token/schemas/network.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { HttpModule } from '@nestjs/axios';
import { TwoFactorVerificationGuard } from '../global/guards/two.factor.verification.guard';
import { OTPGuard } from '../global/guards/otp.guard';
import {
  DepositSetting,
  DepositSettingSchema,
} from '../token/schemas/deposit.settings.schema';
import {
  WithdrawSetting,
  WithdrawSettingSchema,
} from '../token/schemas/withdraw.settings.schema';
import { WalletService } from './wallet.service';
import { TokenService } from '../token/token.service';
import {
  TokenSetting,
  TokenSettingSchema,
} from '../token/schemas/token.setting.schema';
import {
  SwapSetting,
  SwapSettingSchema,
} from '../token/schemas/swap.settings.schema';
import {
  TokenATHPrice,
  TokenATHPriceSchema,
} from '../token/schemas/token-price.schema';
import { EmailModule } from '../email/email.module';
import { MyBlockchainIdService } from '../my-blockchain-id/my-blockchain-id.service';
import { NotificationModule } from '../notification/notification.module';
import { GatewayModule } from '../gateway/gateway.module';
import {
  WalletSetting,
  WalletSettingSchema,
} from './schemas/wallet.settings.schema';
import { TrxCounter, TrxCounterSchema } from './schemas/trx-counter.schema';
import {
  WebhookModel,
  WebhookModelSchema,
} from '../webhook/schemas/webhookModel.schema';
import { WebhookModule } from '../webhook/webhook.module';
import { WebhookService } from '../webhook/webhook.service';
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
import { WalletDepositService } from './wallet.deposit.service';
import {
  DepositAndStakeProducts,
  DepositAndStakeProductsSchema,
} from './schemas/depositAndStakeProducts';
import {
  DepositAndStakeTransaction,
  DepositAndStakeTransactionSchema,
} from './schemas/depositAndStakeTransaction';
import {
  DepositAndStakeSettings,
  DepositAndStakeSettingsSchema,
} from '../token/schemas/depositAndStackSettings.schema';
import { Platform, PlatformSchema } from '../platform/schemas/platform.schema';
import { PlatformModule } from '../platform/platform.module';
import { PlatformService } from '../platform/platform.service';
import {
  SpecialSwapSetting,
  SpecialSwapSettingSchema,
} from '@/src/token/schemas/special.swap.settings.schema';
import {
  SpecialSwapTransaction,
  SpecialSwapTransactionSchema,
} from './schemas/special.swap.transaction.schema';
// import { SupernodeService } from '../supernode/supernode.service';
import {
  EnrolledPlatform,
  EnrolledPlatformSchema,
} from '../platform/schemas/enrolled-platform.schema';
import { PlatformAds, PlatformAdsSchema } from '../platform/schemas/ads.schema';
import {
  FavoritePlatform,
  FavoritePlatformSchema,
} from '../platform/schemas/favorite-platform.schema';
import { KMallService } from '../k-mall/kmall.service';
import { CacheService } from '../cache/cache.service';
import { CloudKService } from '../cloud-k/cloud-k.service';
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
  UserGask,
  UserGaskSchema,
} from '../supernode/schemas/user-gask.schema';
import {
  GlobalPool,
  GlobalPoolSchema,
} from '../supernode/schemas/sn-global-pool.schema';
import {
  SuperNodeGaskSetting,
  SuperNodeGaskSettingSchema,
} from '../supernode/schemas/sn-gask-setting.schema';
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
import { SupernodeService } from '../supernode/supernode.service';
import { SNGlogbalPollService } from '../supernode/sn-global-poll.service';
import {
  MyFriendsBonusTransaction,
  MyFriendsBonusTransactionSchema,
} from '../myfriends/schemas/bonus-transactions.schema';
import {
  MyFriendsProductPurhcaseBonusSetting,
  MyFriendsProductPurhcaseBonusSettingSchema,
} from '../myfriends/schemas/product-purchase-bonus-setting.schema';
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
  CloudKMachineStakeTransaction,
  CloudKMachineStakeTransactionSchema,
} from '../cloud-k/schemas/stake-history.schema';
import {
  PlatformVoucher,
  PlatformVoucherSchema,
} from '../platform-voucher/schemas/platform-voucher.schema';
import {
  OnChainWalletSetting,
  OnChainWalletSettingSchema,
} from '../token/schemas/on.chain.wallet.setting.schema';
import {
  TrustpilotWebhookModel,
  TrustpilotWebhookModelSchema,
} from '../webhook/schemas/trustpilotModel.schema';
import {
  DepositTransactionSummary,
  DepositTransactionSummarySchema,
} from './schemas/deposit.summary.schema';
import {
  WithdrawSummary,
  WithdrawSummarySchema,
} from './schemas/withdraw.summary.schema';
import { WalletBalanceService } from './wallet.balance.service';
import {
  SwapTransactionHistory,
  SwapTransactionHistorySchema,
} from './schemas/swap.transaction.history.schema';
import {
  DepositTransactionHistory,
  DepositTransactionHistorySchema,
} from './schemas/deposit.history.transaction.schema';
import {
  OnChainAttempt,
  OnChainAttemptSchema,
} from '../token/schemas/on.chain.attempt.schema';
import { UserRewards, UserRewardsSchema } from '../users/schemas/user-rewards';
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
  GenExtraRewardHistory,
  GenExtraRewardHistorySchema,
} from '../cloud-k/schemas/gen-extra-reward-history.schema';
import {
  UserTeamMachineStakes,
  UserTeamMachineStakesSchema,
} from '../supernode/schemas/user-team-machine-stacks.schema';
import {
  AdditionalMintingPromotion,
  AdditionalMintingPromotionSchema,
} from '../admin/schemas/additional-minting-promotion.schema';
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
    MongooseModule.forFeature([
      { name: Wallet.name, schema: WalletSchema },
      { name: OnChainWallet.name, schema: OnChainWalletSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
      { name: SwapTransaction.name, schema: SwapTransactionSchema },
      { name: WithdrawTransaction.name, schema: WithdrawTransactionSchema },
      { name: DepositTransaction.name, schema: DepositTransactionSchema },
      { name: TransferTransaction.name, schema: TransferTransactionSchema },
      { name: Token.name, schema: TokenSchema },
      { name: TokenSetting.name, schema: TokenSettingSchema },
      // { name: WebhookModel.name, schema: WebhookModelSchema },
      { name: Network.name, schema: NetworkSchema },
      { name: CloudKSetting.name, schema: CloudKSettingSchema },
      { name: CloudKMachineStake.name, schema: CloudKMachineStakeSchema },
      { name: CloudKMachine.name, schema: CloudKMachineSchema },
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: DepositSetting.name,
        schema: DepositSettingSchema,
      },
      {
        name: WithdrawSetting.name,
        schema: WithdrawSettingSchema,
      },
      {
        name: SwapSetting.name,
        schema: SwapSettingSchema,
      },
      {
        name: SpecialSwapSetting.name,
        schema: SpecialSwapSettingSchema,
      },
      {
        name: TokenATHPrice.name,
        schema: TokenATHPriceSchema,
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
        name: WalletSetting.name,
        schema: WalletSettingSchema,
      },
      {
        name: TrxCounter.name,
        schema: TrxCounterSchema,
      },

      {
        name: DepositAndStakeProducts.name,
        schema: DepositAndStakeProductsSchema,
      },
      {
        name: DepositTransactionHistory.name,
        schema: DepositTransactionHistorySchema,
      },
      {
        name: DepositAndStakeTransaction.name,
        schema: DepositAndStakeTransactionSchema,
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
        name: EnrolledPlatform.name,
        schema: EnrolledPlatformSchema,
      },
      {
        name: FavoritePlatform.name,
        schema: FavoritePlatformSchema,
      },
      {
        name: PlatformAds.name,
        schema: PlatformAdsSchema,
      },
      {
        name: CloudKSimulationMachine.name,
        schema: CloudKSimulationMachineSchema,
      },
      {
        name: CloudKReward.name,
        schema: CloudKRewardSchema,
      },
      {
        name: CloudKAutoCompoundPenalty.name,
        schema: CloudKAutoCompoundPenaltySchema,
      },
      { name: CloudKInflation.name, schema: CloudKInflationSchema },
      {
        name: CloudKInflationRules.name,
        schema: CloudKInflationRulesSchema,
      },
      {
        name: CloudKGlobalAutoCompound.name,
        schema: CloudKGlobalAutoCompoundSchema,
      },
      { name: CloudKProduct.name, schema: CloudKProductSchema },
      { name: CloudKDailyJob.name, schema: CloudKDailyJobSchema },
      { name: CloudKTransactions.name, schema: CloudKTransactionsSchema },
      { name: CloudKOverrideBoost.name, schema: CloudKOverrideBoostSchema },
      { name: UserGask.name, schema: UserGaskSchema },
      { name: GlobalPool.name, schema: GlobalPoolSchema },
      { name: SuperNodeGaskSetting.name, schema: SuperNodeGaskSettingSchema },
      { name: CloudKKillSetting.name, schema: CloudKKillSettingSchema },
      { name: ActiveUserTree.name, schema: ActiveUserTreeSchema },
      { name: MachineCounter.name, schema: MachineCounterSchema },
      {
        name: MyFriendsBonusTransaction.name,
        schema: MyFriendsBonusTransactionSchema,
      },
      {
        name: MyFriendsProductPurhcaseBonusSetting.name,
        schema: MyFriendsProductPurhcaseBonusSettingSchema,
      },
      { name: BaseReferralSetting.name, schema: BaseReferralSettingSchema },
      { name: BaseReferralLevelSetting.name, schema: BaseReferralLevelSchema },
      { name: SNBonusTransaction.name, schema: SNBonusTransactionSchema },
      { name: SnSetting.name, schema: SnSettingSchema },
      {
        name: BuilderGenerationSetting.name,
        schema: BuilderGenerationSettingSchema,
      },
      {
        name: BuilderGenerationLevelSetting.name,
        schema: BuilderGenerationLevelSettingSchema,
      },
      {
        name: BuilderReferralSetting.name,
        schema: BuilderReferralSettingSchema,
      },
      {
        name: Sngp.name,
        schema: SngpSchema,
      },
      {
        name: UserSngp.name,
        schema: UserSngpSchema,
      },
      {
        name: SngpRewards.name,
        schema: SngpRewardsSchema,
      },
      {
        name: SngpDistribution.name,
        schema: SngpDistributionSchema,
      },
      {
        name: CloudKMachineStakeTransaction.name,
        schema: CloudKMachineStakeTransactionSchema,
      },
      {
        name: PlatformVoucher.name,
        schema: PlatformVoucherSchema,
      },
      {
        name: OnChainWalletSetting.name,
        schema: OnChainWalletSettingSchema,
      },
      {
        name: TrustpilotWebhookModel.name,
        schema: TrustpilotWebhookModelSchema,
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
        name: WebhookModel.name,
        schema: WebhookModelSchema,
      },
      {
        name: OnChainAttempt.name,
        schema: OnChainAttemptSchema,
      },
      {
        name: UserRewards.name,
        schema: UserRewardsSchema,
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
    HttpModule,
    KMallModule,
    NotificationModule,
    EmailModule,
    GatewayModule,
    WebhookModule,
    PlatformModule,
  ],
  controllers: [WalletController],
  providers: [
    WalletService,
    WalletDepositService,
    TwoFactorVerificationGuard,
    OTPGuard,
    TokenService,
    WalletBalanceService,
    MyBlockchainIdService,
    WebhookService,
    PlatformService,
    KMallService,
    CacheService,
    CloudKService,
    MyFriendsService,
    SupernodeService,
    SNGlogbalPollService,
    SupernodeSummaryService,
    TwoAccessService,
    // PlatformService,
  ],
  exports: [WalletService, WalletDepositService, WalletBalanceService],
})
export class WalletModule {}
