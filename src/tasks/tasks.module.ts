import { HttpModule } from '@nestjs/axios';
import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheService } from '../cache/cache.service';
import { CloudKModule } from '../cloud-k/cloud-k.module';
import {
  CloudKMachineStake,
  CloudKMachineStakeSchema,
} from '../cloud-k/schemas/cloudk-machine-stakes.schema';
import {
  CloudKMachine,
  CloudKMachineSchema,
} from '../cloud-k/schemas/cloudk-machine.schema';
import {
  CloudKReward,
  CloudKRewardSchema,
} from '../cloud-k/schemas/cloudk-reward.schema';
import {
  CloudKSetting,
  CloudKSettingSchema,
} from '../cloud-k/schemas/cloudk-setting.schema';
import {
  CloudKTransactions,
  CloudKTransactionsSchema,
} from '../cloud-k/schemas/cloudk-transactions.schema';
import { EmailService } from '../email/email.service';
import { GatewayService } from '../gateway/gateway.service';
import { KMallService } from '../k-mall/kmall.service';
import { MyBlockchainIdService } from '../my-blockchain-id/my-blockchain-id.service';
import { NotificationService } from '../notification/notification.service';
import {
  Notification,
  NotificationSchema,
} from '../notification/schemas/notification.schema';
import { BuilderReferralService } from '../supernode/builder-referral.service';
import {
  BaseReferralLevelSchema,
  BaseReferralLevelSetting,
} from '../supernode/schemas/base-referral-level-settings.schema';
import {
  BaseReferralSetting,
  BaseReferralSettingSchema,
} from '../supernode/schemas/base-referral-setting.schema';
import {
  BuilderGenerationLevelSetting,
  BuilderGenerationLevelSettingSchema,
} from '../supernode/schemas/builder-generation-level-settings.schema';
import {
  BuilderGenerationSetting,
  BuilderGenerationSettingSchema,
} from '../supernode/schemas/builder-generation-settings';
import {
  BuilderReferralData,
  BuilderReferralDataSchema,
} from '../supernode/schemas/builder-referral-data.schema';
import {
  BuilderReferralSetting,
  BuilderReferralSettingSchema,
} from '../supernode/schemas/builder-referral-settings.schema';

import { AdminModule } from '../admin/admin.module';

import {
  SNBonusTransaction,
  SNBonusTransactionSchema,
} from '../supernode/schemas/sn-bonus-transaction.schema';
import {
  GlobalPool,
  GlobalPoolSchema,
} from '../supernode/schemas/sn-global-pool.schema';
import {
  SnSetting,
  SnSettingSchema,
} from '../supernode/schemas/sn-settings.schema';
import {
  SngpDistribution,
  SngpDistributionSchema,
} from '../supernode/schemas/sngp-distribution.schema';
import {
  SngpRewards,
  SngpRewardsSchema,
} from '../supernode/schemas/sngp-rewards.schema';
import { Sngp, SngpSchema } from '../supernode/schemas/sngp.schema';
import {
  UserGask,
  UserGaskSchema,
} from '../supernode/schemas/user-gask.schema';
import {
  UserSngp,
  UserSngpSchema,
} from '../supernode/schemas/user-sngp.schema';
import { SupernodeService } from '../supernode/supernode.service';
import {
  DepositSetting,
  DepositSettingSchema,
} from '../token/schemas/deposit.settings.schema';
import { Network, NetworkSchema } from '../token/schemas/network.schema';
import { Token, TokenSchema } from '../token/schemas/token.schema';
import {
  WithdrawSetting,
  WithdrawSettingSchema,
} from '../token/schemas/withdraw.settings.schema';
import { TokenModule } from '../token/token.module';
import {
  ActiveUserTree,
  ActiveUserTreeSchema,
} from '../users/schemas/active-user-tree.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { UsersModule } from '../users/users.module';
import {
  DepositTransaction,
  DepositTransactionSchema,
} from '../wallet/schemas/deposit.transaction.schema';
import {
  OnChainWallet,
  OnChainWalletSchema,
} from '../wallet/schemas/on.chain.wallet.schema';
import {
  SwapTransaction,
  SwapTransactionSchema,
} from '../wallet/schemas/swap.transaction.schema';
import {
  TransferTransaction,
  TransferTransactionSchema,
} from '../wallet/schemas/transfer.transaction.schema';
import {
  TrxCounter,
  TrxCounterSchema,
} from '../wallet/schemas/trx-counter.schema';
import { Wallet, WalletSchema } from '../wallet/schemas/wallet.schema';
import {
  WalletSetting,
  WalletSettingSchema,
} from '../wallet/schemas/wallet.settings.schema';
import {
  WalletTransaction,
  WalletTransactionSchema,
} from '../wallet/schemas/wallet.transaction.schema.';
import {
  WithdrawTransaction,
  WithdrawTransactionSchema,
} from '../wallet/schemas/withdraw.transaction.schema';
import { WalletModule } from '../wallet/wallet.module';
import { WalletService } from '../wallet/wallet.service';
import { TasksService } from './tasks.service';
import { WebhookService } from '../webhook/webhook.service';
import {
  WebhookModel,
  WebhookModelSchema,
} from '../webhook/schemas/webhookModel.schema';
import {
  DepositAndStakeSettings,
  DepositAndStakeSettingsSchema,
} from '../token/schemas/depositAndStackSettings.schema';
import { Platform, PlatformSchema } from '../platform/schemas/platform.schema';
import {
  SpecialSwapSetting,
  SpecialSwapSettingSchema,
} from '../token/schemas/special.swap.settings.schema';
import {
  SpecialSwapTransaction,
  SpecialSwapTransactionSchema,
} from '../wallet/schemas/special.swap.transaction.schema';
import { PlatformService } from '../platform/platform.service';
import { PlatformAds, PlatformAdsSchema } from '../platform/schemas/ads.schema';
import {
  EnrolledPlatform,
  EnrolledPlatformSchema,
} from '../platform/schemas/enrolled-platform.schema';
import {
  FavoritePlatform,
  FavoritePlatformSchema,
} from '../platform/schemas/favorite-platform.schema';
import { WalletDepositService } from '../wallet/wallet.deposit.service';
import { CloudKService } from '../cloud-k/cloud-k.service';
import { UsersService } from '../users/users.service';
import {
  DepositAndStakeProducts,
  DepositAndStakeProductsSchema,
} from '../wallet/schemas/depositAndStakeProducts';
import {
  DepositAndStakeTransaction,
  DepositAndStakeTransactionSchema,
} from '../wallet/schemas/depositAndStakeTransaction';
import {
  CloudKSimulationMachine,
  CloudKSimulationMachineSchema,
} from '../cloud-k/schemas/cloudk-simulation-machine.schema';
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
  CloudKOverrideBoost,
  CloudKOverrideBoostSchema,
} from '../cloud-k/schemas/cloudk-boost-overrirde.schema';
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
  MachineCounter,
  MachineCounterSchema,
} from '../cloud-k/schemas/machine-counter.schema';
import { SNGlogbalPollService } from '../supernode/sn-global-poll.service';
import {
  UserMembership,
  UserMembershipSchema,
} from '../users/schemas/membership.schema';
import {
  UserImportJob,
  UserImportJobSchema,
} from '../users/schemas/user-import-job';
import {
  MyFriendsBonusTransaction,
  MyFriendsBonusTransactionSchema,
} from '../myfriends/schemas/bonus-transactions.schema';
import {
  MyFriendsProductPurhcaseBonusSetting,
  MyFriendsProductPurhcaseBonusSettingSchema,
} from '../myfriends/schemas/product-purchase-bonus-setting.schema';
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
import {
  UserAnalyticsLog,
  UserAnalyticsLogSchema,
} from '../users/schemas/user-analytics-log.schema';

import { WebhookModule } from '../webhook/webhook.module';
import { TwoAccessService } from '../two-access/two-access.service';
import {
  CloudKAutoCompoundSetting,
  CloudKAutoCompoundSettingSchema,
} from '../cloud-k/schemas/cloudk-autoCompound-setting.schema';
import {
  MembershipWebhookModel,
  MembershipWebhookModelSchema,
} from '../webhook/schemas/membershipWebhookModel.schema';
import {
  WallekStake,
  WallekStakeSchema,
} from '../wallek-stake/schemas/wallek-stake.schema';
import { WallekStakeModule } from '../wallek-stake/wallek-stake.module';
import {
  AdditionalMintingPromotion,
  AdditionalMintingPromotionSchema,
} from '../admin/schemas/additional-minting-promotion.schema';
import {
  WebhookUploadRewardFile,
  WebhookUploadRewardFileSchema,
} from '../webhook/schemas/webhookUploadRewardFile';
import {
  UserBlockAdminLogs,
  UserBlockAdminLogsSchema,
} from '../admin/schemas/user.block.admin.schema';
import { DeviceService } from '../device/device.service';
import { Device, DeviceSchema } from '../device/schemas/device.schema';
import {
  GenExtraRewardHistory,
  GenExtraRewardHistorySchema,
} from '../cloud-k/schemas/gen-extra-reward-history.schema';
import { BullmqService } from '../bullmq/bullmq.service';
import { BullModule } from '@nestjs/bullmq';
import { QueueNames } from '../bullmq/enums/queue-names.enum';
import { RewardProcessor } from './supernode-reward.processor';
import { BaseReferralRewardService } from '../supernode/base-referral-generate.service';
import { BuilderGenerationalRewardService } from '../supernode/builder-generation.service';
import { AdminSupernodeService } from '../supernode/admin.supernode.service';
import {
  UserTeamMachineStakes,
  UserTeamMachineStakesSchema,
} from '../supernode/schemas/user-team-machine-stacks.schema';
import { TBalanceService } from '../t-balance/t-balance.service';
import {
  TBalanceUserProduct,
  TBalanceUserProductSchema,
} from '../t-balance/schema/t-balanceUserProduct.schema';
import {
  TBalanceProduct,
  TBalanceProductSchema,
} from '../t-balance/schema/t-balanceProduct.schema';
import { TBalanceModule } from '../t-balance/t-balance.module';
import {
  TokenATHPrice,
  TokenATHPriceSchema,
} from '../token/schemas/token-price.schema';
import {
  SwapSetting,
  SwapSettingSchema,
} from '../token/schemas/swap.settings.schema';
import {
  ProductPurchaseUserDetailHistory,
  ProductPurchaseUserDetailHistorySchema,
} from '../t-balance/schema/t-balanceProductPurchaseUserDetailHistory.schema';
import { EmailModule } from '../email/email.module';
import {
  TBalanceUploadFilesLogHistory,
  TBalanceUploadFilesLogHistorySchema,
} from '../t-balance/schema/t-balanceProcessHistory.schema';
import {
  AdditionalCountryLevelSetting,
  AdditionalCountryLevelSettingSchema,
} from '../admin/schemas/additional.product.minting.Schema';
import {
  InactiveAdditionalCountryLevelSetting,
  InactiveAdditionalCountryLevelSettingSchema,
} from '../admin/schemas/inactive-additional.product.minting.Schema';
import { CloudKRewardService } from '../cloud-k/cloudk-reward.service';
import {
  NodekRewardFilePath,
  NodekRewardFilePathSchema,
} from '../cloud-k/schemas/nodek-reward-job.schema';

import {
  QueueJobLog,
  QueueJobLogSchema,
} from '../bullmq/schemas/queue-job-log.schema';

import { UsdkStakeRewardService } from '../usdk-stake/usdk-stake-reward.service';
import {
  UsdkStakeReward,
  UsdkStakeRewardSchema,
} from '../usdk-stake/schemas/usdkStakeReward.schema';
import { UsdkStakeService } from '../usdk-stake/usdk-stake.service';
import {
  UsdkStakeSettings,
  UsdkStakeSettingsSchema,
} from '../usdk-stake/schemas/usdkStakeSettings.schema';
import {
  UsdkStakeTransactions,
  UsdkStakeTransactionsSchema,
} from '../usdk-stake/schemas/usdkStakeTransaction.schema';
import {
  UsdkStakeTransactionHistory,
  UsdkStakeTransactionHistorySchema,
} from '../usdk-stake/schemas/usdkStakeTransactionHistory';
import {
  UsdkStakeGlobalAutoCompound,
  UsdkStakeGlobalAutoCompoundSchema,
} from '../usdk-stake/schemas/usdkstake-global-auto-compund.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CloudKMachine.name, schema: CloudKMachineSchema },
      { name: BuilderReferralData.name, schema: BuilderReferralDataSchema },
      { name: SNBonusTransaction.name, schema: SNBonusTransactionSchema },
      { name: User.name, schema: UserSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: UserGask.name, schema: UserGaskSchema },
      { name: BaseReferralSetting.name, schema: BaseReferralSettingSchema },
      { name: BaseReferralLevelSetting.name, schema: BaseReferralLevelSchema },
      { name: CloudKReward.name, schema: CloudKRewardSchema },
      { name: CloudKTransactions.name, schema: CloudKTransactionsSchema },
      { name: GlobalPool.name, schema: GlobalPoolSchema },
      { name: SnSetting.name, schema: SnSettingSchema },
      { name: ActiveUserTree.name, schema: ActiveUserTreeSchema },
      { name: CloudKSetting.name, schema: CloudKSettingSchema },
      { name: Wallet.name, schema: WalletSchema },
      { name: OnChainWallet.name, schema: OnChainWalletSchema },
      { name: Token.name, schema: TokenSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
      { name: WithdrawTransaction.name, schema: WithdrawTransactionSchema },
      { name: TransferTransaction.name, schema: TransferTransactionSchema },
      { name: SwapTransaction.name, schema: SwapTransactionSchema },
      { name: DepositTransaction.name, schema: DepositTransactionSchema },
      {
        name: DepositTransactionHistory.name,
        schema: DepositTransactionHistorySchema,
      },
      { name: Network.name, schema: NetworkSchema },
      { name: DepositSetting.name, schema: DepositSettingSchema },
      { name: WithdrawSetting.name, schema: WithdrawSettingSchema },
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
        name: CloudKMachineStake.name,
        schema: CloudKMachineStakeSchema,
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
      // {
      //   name: WebhookModel.name,
      //   schema: WebhookModelSchema,
      // },
      {
        name: DepositAndStakeSettings.name,
        schema: DepositAndStakeSettingsSchema,
      },
      {
        name: Platform.name,
        schema: PlatformSchema,
      },
      {
        name: SpecialSwapSetting.name,
        schema: SpecialSwapSettingSchema,
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
        name: DepositAndStakeTransaction.name,
        schema: DepositAndStakeTransactionSchema,
      },
      {
        name: CloudKSimulationMachine.name,
        schema: CloudKSimulationMachineSchema,
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
        name: CloudKOverrideBoost.name,
        schema: CloudKOverrideBoostSchema,
      },
      {
        name: CloudKDailyJob.name,
        schema: CloudKDailyJobSchema,
      },
      {
        name: SuperNodeGaskSetting.name,
        schema: SuperNodeGaskSettingSchema,
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
        name: UserMembership.name,
        schema: UserMembershipSchema,
      },
      {
        name: UserImportJob.name,
        schema: UserImportJobSchema,
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
        name: CloudKMachineStakeTransaction.name,
        schema: CloudKMachineStakeTransactionSchema,
      },
      {
        name: SuperNodeGaskSetting.name,
        schema: SuperNodeGaskSettingSchema,
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
        name: UserRewards.name,
        schema: UserRewardsSchema,
      },
      {
        name: UserAnalyticsLog.name,
        schema: UserAnalyticsLogSchema,
      },
      {
        name: WebhookModel.name,
        schema: WebhookModelSchema,
      },
      {
        name: CloudKAutoCompoundSetting.name,
        schema: CloudKAutoCompoundSettingSchema,
      },
      {
        name: WallekStake.name,
        schema: WallekStakeSchema,
      },
      {
        name: AdditionalMintingPromotion.name,
        schema: AdditionalMintingPromotionSchema,
      },
      {
        name: WebhookUploadRewardFile.name,
        schema: WebhookUploadRewardFileSchema,
      },
      { name: UserBlockAdminLogs.name, schema: UserBlockAdminLogsSchema },
      { name: Device.name, schema: DeviceSchema },
      {
        name: GenExtraRewardHistory.name,
        schema: GenExtraRewardHistorySchema,
      },
      {
        name: UserTeamMachineStakes.name,
        schema: UserTeamMachineStakesSchema,
      },
      //
      {
        name: TokenATHPrice.name,
        schema: TokenATHPriceSchema,
      },

      {
        name: SwapSetting.name,
        schema: SwapSettingSchema,
      },

      {
        name: ProductPurchaseUserDetailHistory.name,
        schema: ProductPurchaseUserDetailHistorySchema,
      },

      {
        name: SwapSetting.name,
        schema: SwapSettingSchema,
      },
      { name: TBalanceProduct.name, schema: TBalanceProductSchema },
      {
        name: TBalanceUserProduct.name,
        schema: TBalanceUserProductSchema,
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
        name: NodekRewardFilePath.name,
        schema: NodekRewardFilePathSchema,
      },
      { name: QueueJobLog.name, schema: QueueJobLogSchema },
      {
        name: UsdkStakeReward.name,
        schema: UsdkStakeRewardSchema,
      },
      {
        name: UsdkStakeSettings.name,
        schema: UsdkStakeSettingsSchema,
      },
      {
        name: UsdkStakeTransactions.name,
        schema: UsdkStakeTransactionsSchema,
      },
      {
        name: UsdkStakeTransactionHistory.name,
        schema: UsdkStakeTransactionHistorySchema,
      },
      {
        name: UsdkStakeGlobalAutoCompound.name,
        schema: UsdkStakeGlobalAutoCompoundSchema,
      },
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
    TokenModule,
    AdminModule,
    CloudKModule,
    UsersModule,
    HttpModule,
    WebhookModule,
    WallekStakeModule,
    ...Object.values(QueueNames).map((queueName) =>
      BullModule.registerQueue({
        name: queueName,
      }),
    ),
    EmailModule,
    forwardRef(() => WalletModule),
  ],
  providers: [
    TasksService,
    BuilderReferralService,
    CacheService,
    SupernodeService,
    WalletService,
    KMallService,
    NotificationService,
    EmailService,
    MyBlockchainIdService,
    GatewayService,
    WebhookService,
    PlatformService,
    WalletDepositService,
    CloudKService,
    UsersService,
    MyFriendsService,
    SNGlogbalPollService,
    SupernodeSummaryService,
    TwoAccessService,
    DeviceService,
    BullmqService,
    RewardProcessor,
    BaseReferralRewardService,
    BuilderGenerationalRewardService,
    AdminSupernodeService,
    TBalanceService,
    CloudKRewardService,
    UsdkStakeRewardService,
    UsdkStakeService,
  ],
})
export class TasksModule {}
