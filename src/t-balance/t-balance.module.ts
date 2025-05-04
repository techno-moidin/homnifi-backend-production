import { Global, Module } from '@nestjs/common';
import { TBalanceController } from './t-balance.controller';
import { TBalanceService } from './t-balance.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  TBalanceProduct,
  TBalanceProductSchema,
} from './schema/t-balanceProduct.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import {
  ProductPurchaseUserDetailHistory,
  ProductPurchaseUserDetailHistorySchema,
} from './schema/t-balanceProductPurchaseUserDetailHistory.schema';
import {
  TBalanceUserProduct,
  TBalanceUserProductSchema,
} from './schema/t-balanceUserProduct.schema';
import { WalletService } from '../wallet/wallet.service';
import { HttpModule, HttpService } from '@nestjs/axios';
import { WalletModule } from '../wallet/wallet.module';
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
import { Wallet, WalletSchema } from '../wallet/schemas/wallet.schema';
import {
  OnChainWallet,
  OnChainWalletSchema,
} from '../wallet/schemas/on.chain.wallet.schema';
import { Token, TokenSchema } from '../token/schemas/token.schema';
import {
  WalletTransaction,
  WalletTransactionSchema,
} from '../wallet/schemas/wallet.transaction.schema.';
import {
  WithdrawTransaction,
  WithdrawTransactionSchema,
} from '../wallet/schemas/withdraw.transaction.schema';
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
import {
  WithdrawSetting,
  WithdrawSettingSchema,
} from '../token/schemas/withdraw.settings.schema';
import { Platform, PlatformSchema } from '../platform/schemas/platform.schema';
import { KMallService } from '../k-mall/kmall.service';
import { TokenService } from '../token/token.service';
import { NotificationService } from '../notification/notification.service';
import { EmailService } from '../email/email.service';
import { MyBlockchainIdService } from '../my-blockchain-id/my-blockchain-id.service';
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
  MembershipWebhookModel,
  MembershipWebhookModelSchema,
} from '../webhook/schemas/membershipWebhookModel.schema';
import {
  OnChainAttempt,
  OnChainAttemptSchema,
} from '../token/schemas/on.chain.attempt.schema';
import {
  WithdrawSummary,
  WithdrawSummarySchema,
} from '../wallet/schemas/withdraw.summary.schema';
import { CacheService } from '../cache/cache.service';
import {
  PlatformVoucherSchema,
  PlatformVoucher,
} from '../platform-voucher/schemas/platform-voucher.schema';
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
  Notification,
  NotificationSchema,
} from '../notification/schemas/notification.schema';
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
  CloudKAutoCompoundSetting,
  CloudKAutoCompoundSettingSchema,
} from '../cloud-k/schemas/cloudk-autoCompound-setting.schema';
import {
  AdditionalMintingPromotion,
  AdditionalMintingPromotionSchema,
} from '../admin/schemas/additional-minting-promotion.schema';
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
import { UserRewards, UserRewardsSchema } from '../users/schemas/user-rewards';
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
import { UserSngp } from '../supernode/schemas/user-sngp.schema';
import {
  SngpRewards,
  SngpRewardsSchema,
} from '../supernode/schemas/sngp-rewards.schema';
import {
  SngpDistribution,
  SngpDistributionSchema,
} from '../supernode/schemas/sngp-distribution.schema';
import { SupernodeSummaryService } from '../supernode/supernode.summary.service';
import {
  MyFriendsBonusTransaction,
  MyFriendsBonusTransactionSchema,
} from '../myfriends/schemas/bonus-transactions.schema';
import {
  MyFriendsProductPurhcaseBonusSetting,
  MyFriendsProductPurhcaseBonusSettingSchema,
} from '../myfriends/schemas/product-purchase-bonus-setting.schema';
import {
  GenExtraRewardHistory,
  GenExtraRewardHistorySchema,
} from '../cloud-k/schemas/gen-extra-reward-history.schema';
import { TwoAccessService } from '../two-access/two-access.service';
import {
  UserTeamMachineStakes,
  UserTeamMachineStakesSchema,
} from '../supernode/schemas/user-team-machine-stacks.schema';
import { EmailModule } from '../email/email.module';
import {
  TBalanceUploadFilesLogHistory,
  TBalanceUploadFilesLogHistorySchema,
} from './schema/t-balanceProcessHistory.schema';
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

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TBalanceProduct.name, schema: TBalanceProductSchema },
      { name: User.name, schema: UserSchema },
      {
        name: ProductPurchaseUserDetailHistory.name,
        schema: ProductPurchaseUserDetailHistorySchema,
      },
      {
        name: TBalanceUserProduct.name,
        schema: TBalanceUserProductSchema,
      },
      {
        name: CloudKSetting.name,
        schema: CloudKSettingSchema,
      },
      {
        name: CloudKMachineStake.name,
        schema: CloudKMachineStakeSchema,
      },
      {
        name: CloudKMachine.name,
        schema: CloudKMachineSchema,
      },
      {
        name: Wallet.name,
        schema: WalletSchema,
      },
      {
        name: OnChainWallet.name,
        schema: OnChainWalletSchema,
      },
      {
        name: Token.name,
        schema: TokenSchema,
      },
      {
        name: WalletTransaction.name,
        schema: WalletTransactionSchema,
      },
      {
        name: WithdrawTransaction.name,
        schema: WithdrawTransactionSchema,
      },
      {
        name: TransferTransaction.name,
        schema: TransferTransactionSchema,
      },
      {
        name: SwapTransaction.name,
        schema: SwapTransactionSchema,
      },
      {
        name: SwapTransactionHistory.name,
        schema: SwapTransactionHistorySchema,
      },
      {
        name: SpecialSwapTransaction.name,
        schema: SpecialSwapTransactionSchema,
      },
      {
        name: DepositTransaction.name,
        schema: DepositTransactionSchema,
      },
      {
        name: DepositTransactionHistory.name,
        schema: DepositTransactionHistorySchema,
      },
      {
        name: Network.name,
        schema: NetworkSchema,
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
        name: Platform.name,
        schema: PlatformSchema,
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
        name: OnChainWalletSetting.name,
        schema: OnChainWalletSettingSchema,
      },
      {
        name: DepositAndStakeTransaction.name,
        schema: DepositAndStakeTransactionSchema,
      },
      {
        name: OnChainAttempt.name,
        schema: OnChainAttemptSchema,
      },
      {
        name: WithdrawSummary.name,
        schema: WithdrawSummarySchema,
      },
      {
        name: PlatformVoucher.name,
        schema: PlatformVoucherSchema,
      },
      {
        name: TokenSetting.name,
        schema: TokenSettingSchema,
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
        name: DepositAndStakeSettings.name,
        schema: DepositAndStakeSettingsSchema,
      },
      {
        name: DepositTransactionSummary.name,
        schema: DepositTransactionSummarySchema,
      },

      {
        name: GenExtraRewardHistory.name,
        schema: GenExtraRewardHistorySchema,
      },
      {
        name: Notification.name,
        schema: NotificationSchema,
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
        name: DepositAndStakeProducts.name,
        schema: DepositAndStakeProductsSchema,
      },
      {
        name: CloudKMachineStakeTransaction.name,
        schema: CloudKMachineStakeTransactionSchema,
      },
      {
        name: SuperNodeGaskSetting.name,
        schema: SuperNodeGaskSettingSchema,
      },
      {
        name: UserGask.name,
        schema: UserGaskSchema,
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
      {
        name: CloudKInflation.name,
        schema: CloudKInflationSchema,
      },
      {
        name: CloudKInflationRules.name,
        schema: CloudKInflationRulesSchema,
      },
      {
        name: CloudKGlobalAutoCompound.name,
        schema: CloudKGlobalAutoCompoundSchema,
      },
      {
        name: CloudKProduct.name,
        schema: CloudKProductSchema,
      },
      {
        name: CloudKDailyJob.name,
        schema: CloudKDailyJobSchema,
      },
      {
        name: CloudKTransactions.name,
        schema: CloudKTransactionsSchema,
      },
      {
        name: CloudKOverrideBoost.name,
        schema: CloudKOverrideBoostSchema,
      },

      {
        name: GlobalPool.name,
        schema: GlobalPoolSchema,
      },
      {
        name: CloudKKillSetting.name,
        schema: CloudKKillSettingSchema,
      },
      {
        name: ActiveUserTree.name,
        schema: ActiveUserTreeSchema,
      },
      {
        name: MachineCounter.name,
        schema: MachineCounterSchema,
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
        name: BaseReferralSetting.name,
        schema: BaseReferralSettingSchema,
      },

      {
        name: BaseReferralLevelSetting.name,
        schema: BaseReferralLevelSchema,
      },
      {
        name: SNBonusTransaction.name,
        schema: SNBonusTransactionSchema,
      },
      {
        name: UserRewards.name,
        schema: UserRewardsSchema,
      },
      {
        name: SnSetting.name,
        schema: SnSettingSchema,
      },
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
        schema: UserSngp,
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
        name: MyFriendsBonusTransaction.name,
        schema: MyFriendsBonusTransactionSchema,
      },
      {
        name: MyFriendsProductPurhcaseBonusSetting.name,
        schema: MyFriendsProductPurhcaseBonusSettingSchema,
      },
      {
        name: UserTeamMachineStakes.name,
        schema: UserTeamMachineStakesSchema,
      },
      {
        name: TBalanceUploadFilesLogHistory.name,
        schema: TBalanceUploadFilesLogHistorySchema,
      },
      {
        name: AdditionalCountryLevelSetting.name,
        schema: AdditionalCountryLevelSettingSchema,
      },
      {
        name: InactiveAdditionalCountryLevelSetting.name,
        schema: InactiveAdditionalCountryLevelSettingSchema,
      },
      {
        name: SwapTransaction.name,
        schema: SwapTransactionSchema,
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
    EmailModule,
  ],
  controllers: [TBalanceController],
  providers: [
    TBalanceService,
    WalletService,
    KMallService,
    TokenService,
    NotificationService,
    EmailService,
    MyBlockchainIdService,
    GatewayService,
    WebhookService,
    PlatformService,
    WalletDepositService,
    CacheService,
    CloudKService,
    SupernodeService,
    MyFriendsService,
    SNGlogbalPollService,
    SupernodeSummaryService,
    TwoAccessService,
  ],
  exports: [TBalanceService],
})
export class TBalanceModule {}
