import { Module } from '@nestjs/common';
import { BurnController } from './burn.controller';
import { BurnService } from './burn.service';
import { Burn, BurnSchema } from './schema/burn.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { CloudKDepositService } from '../cloud-k/cloud-k-deposit.service';
import { CloudKModule } from '../cloud-k/cloud-k.module';
import {
  UserGask,
  UserGaskSchema,
} from '../supernode/schemas/user-gask.schema';
import {
  SuperNodeGaskSetting,
  SuperNodeGaskSettingSchema,
} from '../supernode/schemas/sn-gask-setting.schema';
import { Token, TokenSchema } from '../token/schemas/token.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import {
  CloudKMachineStake,
  CloudKMachineStakeSchema,
} from '../cloud-k/schemas/cloudk-machine-stakes.schema';
import {
  CloudKMachineStakeTransaction,
  CloudKMachineStakeTransactionSchema,
} from '../cloud-k/schemas/stake-history.schema';
import {
  CloudKMachine,
  CloudKMachineSchema,
} from '../cloud-k/schemas/cloudk-machine.schema';
import {
  PlatformVoucher,
  PlatformVoucherSchema,
} from '../platform-voucher/schemas/platform-voucher.schema';
import { SupernodeService } from '../supernode/supernode.service';
import { CacheService } from '../cache/cache.service';
import { CloudKService } from '../cloud-k/cloud-k.service';
import { WalletService } from '../wallet/wallet.service';
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
  CloudKReward,
  CloudKRewardSchema,
} from '../cloud-k/schemas/cloudk-reward.schema';
import {
  CloudKTransactions,
  CloudKTransactionsSchema,
} from '../cloud-k/schemas/cloudk-transactions.schema';
import {
  GlobalPool,
  GlobalPoolSchema,
} from '../supernode/schemas/sn-global-pool.schema';
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
  ActiveUserTree,
  ActiveUserTreeSchema,
} from '../users/schemas/active-user-tree.schema';
import {
  CloudKSimulationMachine,
  CloudKSimulationMachineSchema,
} from '../cloud-k/schemas/cloudk-simulation-machine.schema';
import {
  CloudKAutoCompoundPenalty,
  CloudKAutoCompoundPenaltySchema,
} from '../cloud-k/schemas/ac-penalty.schema';
import { HttpModule } from '@nestjs/axios';
import {
  CloudKInflationRules,
  CloudKInflationRulesSchema,
} from '../cloud-k/schemas/cloudk-inflation-rules.schema';
import {
  CloudKInflation,
  CloudKInflationSchema,
} from '../cloud-k/schemas/cloudk-inflation.schema';
import {
  CloudKGlobalAutoCompound,
  CloudKGlobalAutoCompoundSchema,
} from '../cloud-k/schemas/global-autocompound.schema';
import {
  CloudKSetting,
  CloudKSettingSchema,
} from '../cloud-k/schemas/cloudk-setting.schema';
import { TokenService } from '../token/token.service';
import {
  CloudKProduct,
  CloudKProductSchema,
} from '../cloud-k/schemas/cloudk-products.schema';
import {
  CloudKDailyJob,
  CloudKDailyJobSchema,
} from '../cloud-k/schemas/cloudk-reward-job.schema';
import {
  CloudKOverrideBoost,
  CloudKOverrideBoostSchema,
} from '../cloud-k/schemas/cloudk-boost-overrirde.schema';
import {
  CloudKKillSetting,
  CloudKKillSettingSchema,
} from '../cloud-k/schemas/cloudk-kill.schema';
import { MyBlockchainIdService } from '../my-blockchain-id/my-blockchain-id.service';
import { MyFriendsService } from '../myfriends/myfriends.service';
import {
  MachineCounter,
  MachineCounterSchema,
} from '../cloud-k/schemas/machine-counter.schema';
import { SNGlogbalPollService } from '../supernode/sn-global-poll.service';
import { Wallet, WalletSchema } from '../wallet/schemas/wallet.schema';
import {
  OnChainWallet,
  OnChainWalletSchema,
} from '../wallet/schemas/on.chain.wallet.schema';
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
  DepositTransaction,
  DepositTransactionSchema,
} from '../wallet/schemas/deposit.transaction.schema';
import { Network, NetworkSchema } from '../token/schemas/network.schema';
import {
  DepositSetting,
  DepositSettingSchema,
} from '../token/schemas/deposit.settings.schema';
import {
  WithdrawSetting,
  WithdrawSettingSchema,
} from '../token/schemas/withdraw.settings.schema';
import { KMallService } from '../k-mall/kmall.service';
import { NotificationService } from '../notification/notification.service';
import { EmailService } from '../email/email.service';
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
import {
  MyFriendsBonusTransaction,
  MyFriendsBonusTransactionSchema,
} from '../myfriends/schemas/bonus-transactions.schema';
import {
  MyFriendsProductPurhcaseBonusSetting,
  MyFriendsProductPurhcaseBonusSettingSchema,
} from '../myfriends/schemas/product-purchase-bonus-setting.schema';
import {
  Notification,
  NotificationSchema,
} from '../notification/schemas/notification.schema';
import {
  WebhookModel,
  WebhookModelSchema,
} from '../webhook/schemas/webhookModel.schema';
import { Platform, PlatformSchema } from '../platform/schemas/platform.schema';
import {
  DepositAndStakeProducts,
  DepositAndStakeProductsSchema,
} from '../wallet/schemas/depositAndStakeProducts';
import {
  DepositAndStakeSettings,
  DepositAndStakeSettingsSchema,
} from '../token/schemas/depositAndStackSettings.schema';
import {
  SpecialSwapSetting,
  SpecialSwapSettingSchema,
} from '../token/schemas/special.swap.settings.schema';
import {
  SpecialSwapTransaction,
  SpecialSwapTransactionSchema,
} from '../wallet/schemas/special.swap.transaction.schema';
import { PlatformService } from '../platform/platform.service';
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
  DepositAndStakeTransaction,
  DepositAndStakeTransactionSchema,
} from '../wallet/schemas/depositAndStakeTransaction';
import {
  BurnParticipants,
  BurnParticipantsSchema,
} from './schema/burn.participant.schema';
import { WalletDepositService } from '../wallet/wallet.deposit.service';
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
} from '../wallet/schemas/deposit.summary.schema';
import {
  WithdrawSummary,
  WithdrawSummarySchema,
} from '../wallet/schemas/withdraw.summary.schema';
import {
  DepositTransactionHistory,
  DepositTransactionHistorySchema,
} from '../wallet/schemas/deposit.history.transaction.schema';
import {
  SwapTransactionHistory,
  SwapTransactionHistorySchema,
} from '../wallet/schemas/swap.transaction.history.schema';
import {
  OnChainAttempt,
  OnChainAttemptSchema,
} from '../token/schemas/on.chain.attempt.schema';
import { UserRewards, UserRewardsSchema } from '../users/schemas/user-rewards';
import { SupernodeSummaryService } from '../supernode/supernode.summary.service';
import { WebhookModule } from '../webhook/webhook.module';
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
  MachineSerialNumberDetails,
  MachineSerialNumberDetailsSchema,
} from '../machine-tracking/schema/machine-serialNumber-details.schema';
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
    MongooseModule.forFeature([
      { name: Burn.name, schema: BurnSchema },
      {
        name: UserGask.name,
        schema: UserGaskSchema,
      },
      {
        name: UserRewards.name,
        schema: UserRewardsSchema,
      },
      {
        name: SuperNodeGaskSetting.name,
        schema: SuperNodeGaskSettingSchema,
      },
      {
        name: Token.name,
        schema: TokenSchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: CloudKMachineStake.name,
        schema: CloudKMachineStakeSchema,
      },
      {
        name: SpecialSwapSetting.name,
        schema: SpecialSwapSettingSchema,
      },
      {
        name: SpecialSwapTransaction.name,
        schema: SpecialSwapTransactionSchema,
      },
      {
        name: CloudKMachineStakeTransaction.name,
        schema: CloudKMachineStakeTransactionSchema,
      },
      { name: CloudKMachine.name, schema: CloudKMachineSchema },
      { name: BaseReferralSetting.name, schema: BaseReferralSettingSchema },
      {
        name: BaseReferralLevelSetting.name,
        schema: BaseReferralLevelSchema,
      },
      { name: SNBonusTransaction.name, schema: SNBonusTransactionSchema },
      { name: CloudKReward.name, schema: CloudKRewardSchema },
      {
        name: CloudKTransactions.name,
        schema: CloudKTransactionsSchema,
      },
      {
        name: GlobalPool.name,
        schema: GlobalPoolSchema,
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
        name: PlatformVoucher.name,
        schema: PlatformVoucherSchema,
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
        name: ActiveUserTree.name,
        schema: ActiveUserTreeSchema,
      },
      {
        name: CloudKSimulationMachine.name,
        schema: CloudKSimulationMachineSchema,
      },
      {
        name: Token.name,
        schema: TokenSchema,
      },
      {
        name: CloudKAutoCompoundPenalty.name,
        schema: CloudKAutoCompoundPenaltySchema,
      },
      { name: CloudKInflationRules.name, schema: CloudKInflationRulesSchema },
      { name: CloudKInflation.name, schema: CloudKInflationSchema },
      {
        name: CloudKGlobalAutoCompound.name,
        schema: CloudKGlobalAutoCompoundSchema,
      },
      {
        name: CloudKSetting.name,
        schema: CloudKSettingSchema,
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
        name: CloudKOverrideBoost.name,
        schema: CloudKOverrideBoostSchema,
      },
      {
        name: CloudKKillSetting.name,
        schema: CloudKKillSettingSchema,
      },
      {
        name: MachineCounter.name,
        schema: MachineCounterSchema,
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
        name: WalletSetting.name,
        schema: WalletSettingSchema,
      },
      {
        name: TrxCounter.name,
        schema: TrxCounterSchema,
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
        name: TokenATHPrice.name,
        schema: TokenATHPriceSchema,
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
        name: Notification.name,
        schema: NotificationSchema,
      },
      // {
      //   name: WebhookModel.name,
      //   schema: WebhookModelSchema,
      // },
      {
        name: Platform.name,
        schema: PlatformSchema,
      },
      {
        name: DepositAndStakeProducts.name,
        schema: DepositAndStakeProductsSchema,
      },
      {
        name: DepositAndStakeSettings.name,
        schema: DepositAndStakeSettingsSchema,
      },
      {
        name: SpecialSwapSetting.name,
        schema: SpecialSwapSettingSchema,
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
        name: DepositAndStakeTransaction.name,
        schema: DepositAndStakeTransactionSchema,
      },
      {
        name: BurnParticipants.name,
        schema: BurnParticipantsSchema,
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
        name: OnChainAttempt.name,
        schema: OnChainAttemptSchema,
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
        name: MachineSerialNumberDetails.name,
        schema: MachineSerialNumberDetailsSchema,
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
    WebhookModule,
  ],
  controllers: [BurnController],
  providers: [
    BurnService,
    CloudKDepositService,
    SupernodeService,
    CacheService,
    CloudKService,
    WalletService,
    TokenService,
    MyBlockchainIdService,
    MyFriendsService,
    SNGlogbalPollService,
    KMallService,
    NotificationService,
    EmailService,
    GatewayService,
    WebhookService,
    PlatformService,
    WalletDepositService,
    SupernodeSummaryService,
    TwoAccessService,
  ],
})
export class BurnModule {}
