import { forwardRef, Global, Module } from '@nestjs/common';
import { CloudKService } from './cloud-k.service';
import { CloudKController } from './cloud-k.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CloudKMachine,
  CloudKMachineSchema,
} from './schemas/cloudk-machine.schema';
import {
  CloudKMachineStake,
  CloudKMachineStakeSchema,
} from './schemas/cloudk-machine-stakes.schema';
import {
  CloudKAutoCompoundPenalty,
  CloudKAutoCompoundPenaltySchema,
} from './schemas/ac-penalty.schema';
import {
  CloudKReward,
  CloudKRewardSchema,
} from './schemas/cloudk-reward.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import {
  CloudKInflation,
  CloudKInflationSchema,
} from './schemas/cloudk-inflation.schema';
import {
  CloudKInflationRules,
  CloudKInflationRulesSchema,
} from './schemas/cloudk-inflation-rules.schema';
import { HttpModule } from '@nestjs/axios';
import { WalletModule } from '../wallet/wallet.module';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { CloudKRewardService } from './cloudk-reward.service';
import {
  CloudKGlobalAutoCompound,
  CloudKGlobalAutoCompoundSchema,
} from './schemas/global-autocompound.schema';
import {
  CloudKDailyJob,
  CloudKDailyJobSchema,
} from './schemas/cloudk-reward-job.schema';
import {
  CloudKSetting,
  CloudKSettingSchema,
} from './schemas/cloudk-setting.schema';
import { TokenModule } from '../token/token.module';
import {
  CloudKProduct,
  CloudKProductSchema,
} from './schemas/cloudk-products.schema';
import { Device, DeviceSchema } from '../device/schemas/device.schema';
import {
  CloudKTransactions,
  CloudKTransactionsSchema,
} from './schemas/cloudk-transactions.schema';
import { MyBlockchainIdService } from '../my-blockchain-id/my-blockchain-id.service';
import { MyBlockchainIdModule } from '../my-blockchain-id/my-blockchain-id.module';
import {
  CloudKOverrideBoost,
  CloudKOverrideBoostSchema,
} from './schemas/cloudk-boost-overrirde.schema';
import { EmailModule } from '../email/email.module';
import {
  CloudKSimulationMachine,
  CloudKSimulationMachineSchema,
} from './schemas/cloudk-simulation-machine.schema';
import { CloudKSimulationService } from './cloudk-simulation.service';
import {
  CloudKKillSetting,
  CloudKKillSettingSchema,
} from './schemas/cloudk-kill.schema';
import { MyFriendsModule } from '../myfriends/myfriends.module';
import { SupernodeModule } from '../supernode/supernode.module';
import {
  UserGask,
  UserGaskSchema,
} from '../supernode/schemas/user-gask.schema';
import { SupernodeService } from '../supernode/supernode.service';
import {
  SuperNodeGaskSetting,
  SuperNodeGaskSettingSchema,
} from '../supernode/schemas/sn-gask-setting.schema';
import {
  ActiveUserTree,
  ActiveUserTreeSchema,
} from '../users/schemas/active-user-tree.schema';
import {
  GlobalPool,
  GlobalPoolSchema,
} from '../supernode/schemas/sn-global-pool.schema';
import { CacheService } from '../cache/cache.service';
import {
  MachineCounter,
  MachineCounterSchema,
} from './schemas/machine-counter.schema';
import { Admin, AdminSchema } from '../admin/schemas/admin.schema';
import {
  ImpersonateLog,
  ImpersonateLogSchema,
} from '../impersonate/schemas/impersonate-log.schema';
import {
  ImpersonateHistroty,
  ImpersonateHistrotySchema,
} from '../admin/schemas/impersonate-histroty.schema';
import { CloudKDepositService } from './cloud-k-deposit.service';
import { Token, TokenSchema } from '../token/schemas/token.schema';
import {
  CloudKMachineStakeTransaction,
  CloudKMachineStakeTransactionSchema,
} from './schemas/stake-history.schema';
import { BurnService } from '../burn/burn.service';
import { Burn, BurnSchema } from '../burn/schema/burn.schema';
import { BurnModule } from '../burn/burn.module';
import { Platform, PlatformSchema } from '../platform/schemas/platform.schema';
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
import {
  BurnParticipants,
  BurnParticipantsSchema,
} from '../burn/schema/burn.participant.schema';
import { KMallService } from '../k-mall/kmall.service';
import { KMallModule } from '../k-mall/kmall.module';
import { Network, NetworkSchema } from '../token/schemas/network.schema';
import {
  PlatformVoucher,
  PlatformVoucherSchema,
} from '../platform-voucher/schemas/platform-voucher.schema';
import { GatewayModule } from '../gateway/gateway.module';
import { CloudKDepositV4Service } from './cloud-k-deposit-v4.service';
import { Wallet, WalletSchema } from '../wallet/schemas/wallet.schema';
import {
  SNBonusTransaction,
  SNBonusTransactionSchema,
} from '../supernode/schemas/sn-bonus-transaction.schema';
import { UserRewards, UserRewardsSchema } from '../users/schemas/user-rewards';
import { WalletDepositService } from '../wallet/wallet.deposit.service';
import {
  WalletTransaction,
  WalletTransactionSchema,
} from '../wallet/schemas/wallet.transaction.schema.';
import {
  DepositAndStakeProducts,
  DepositAndStakeProductsSchema,
} from '../wallet/schemas/depositAndStakeProducts';
import {
  DepositAndStakeTransaction,
  DepositAndStakeTransactionSchema,
} from '../wallet/schemas/depositAndStakeTransaction';
import {
  OnChainWallet,
  OnChainWalletSchema,
} from '../wallet/schemas/on.chain.wallet.schema';
import {
  DepositAndStakeSettings,
  DepositAndStakeSettingsSchema,
} from '../token/schemas/depositAndStackSettings.schema';
import {
  DepositSetting,
  DepositSettingSchema,
} from '../token/schemas/deposit.settings.schema';
import { WebhookService } from '../webhook/webhook.service';
import {
  DepositTransactionSummary,
  DepositTransactionSummarySchema,
} from '../wallet/schemas/deposit.summary.schema';
import {
  WebhookModel,
  WebhookModelSchema,
} from '../webhook/schemas/webhookModel.schema';
import {
  WithdrawTransaction,
  WithdrawTransactionSchema,
} from '../wallet/schemas/withdraw.transaction.schema';
import {
  CloudKAutoCompoundSetting,
  CloudKAutoCompoundSettingSchema,
} from './schemas/cloudk-autoCompound-setting.schema';
import {
  MembershipWebhookModel,
  MembershipWebhookModelSchema,
} from '../webhook/schemas/membershipWebhookModel.schema';
import {
  NodekRewardFilePath,
  NodekRewardFilePathSchema,
} from './schemas/nodek-reward-job.schema';
import {
  DepositTransactionHistory,
  DepositTransactionHistorySchema,
} from '../wallet/schemas/deposit.history.transaction.schema';

import {
  MachineSerialNumberDetails,
  MachineSerialNumberDetailsSchema,
} from '../machine-tracking/schema/machine-serialNumber-details.schema';
import { CloudKCommunicationService } from './cloudk-communication.service';
import {
  GenExtraRewardHistory,
  GenExtraRewardHistorySchema,
} from './schemas/gen-extra-reward-history.schema';
import {
  AdditionalCountryLevelSetting,
  AdditionalCountryLevelSettingSchema,
} from '../admin/schemas/additional.product.minting.Schema';
import {
  AdditionalMintingPromotion,
  AdditionalMintingPromotionSchema,
} from '../admin/schemas/additional-minting-promotion.schema';
import {
  InactiveAdditionalCountryLevelSetting,
  InactiveAdditionalCountryLevelSettingSchema,
} from '../admin/schemas/inactive-additional.product.minting.Schema';

import {
  NewUserStake,
  NewUserStakeSchema,
} from './schemas/new-user-stake.schema';

import {
  UsdkStakeSettings,
  UsdkStakeSettingsSchema,
} from '../usdk-stake/schemas/usdkStakeSettings.schema';
import { UsdkStakeService } from '../usdk-stake/usdk-stake.service';
import {
  UsdkStakeTransactions,
  UsdkStakeTransactionsSchema,
} from '../usdk-stake/schemas/usdkStakeTransaction.schema';
import {
  UsdkStakeReward,
  UsdkStakeRewardSchema,
} from '../usdk-stake/schemas/usdkStakeReward.schema';
import { UsdkStakeRewardService } from '../usdk-stake/usdk-stake-reward.service';
import {
  UsdkStakeTransactionHistory,
  UsdkStakeTransactionHistorySchema,
} from '../usdk-stake/schemas/usdkStakeTransactionHistory';
import {
  SwapTransaction,
  SwapTransactionSchema,
} from '../wallet/schemas/swap.transaction.schema';
import {
  SwapTransactionHistory,
  SwapTransactionHistorySchema,
} from '../wallet/schemas/swap.transaction.history.schema';
import {
  UsdkStakeGlobalAutoCompound,
  UsdkStakeGlobalAutoCompoundSchema,
} from '../usdk-stake/schemas/usdkstake-global-auto-compund.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CloudKMachine.name, schema: CloudKMachineSchema },
      { name: CloudKMachineStake.name, schema: CloudKMachineStakeSchema },
      {
        name: ImpersonateLog.name,
        schema: ImpersonateLogSchema,
      },
      {
        name: CloudKAutoCompoundPenalty.name,
        schema: CloudKAutoCompoundPenaltySchema,
      },
      { name: CloudKReward.name, schema: CloudKRewardSchema },
      { name: User.name, schema: UserSchema },
      { name: CloudKInflation.name, schema: CloudKInflationSchema },
      { name: CloudKInflationRules.name, schema: CloudKInflationRulesSchema },
      { name: Admin.name, schema: AdminSchema },
      {
        name: CloudKGlobalAutoCompound.name,
        schema: CloudKGlobalAutoCompoundSchema,
      },
      {
        name: CloudKDailyJob.name,
        schema: CloudKDailyJobSchema,
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
        name: Device.name,
        schema: DeviceSchema,
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
        name: CloudKSimulationMachine.name,
        schema: CloudKSimulationMachineSchema,
      },
      {
        name: CloudKKillSetting.name,
        schema: CloudKKillSettingSchema,
      },
      {
        name: Wallet.name,
        schema: WalletSchema,
      },
      {
        name: UserGask.name,
        schema: UserGaskSchema,
      },
      {
        name: SuperNodeGaskSetting.name,
        schema: SuperNodeGaskSettingSchema,
      },
      {
        name: ActiveUserTree.name,
        schema: ActiveUserTreeSchema,
      },
      {
        name: UserRewards.name,
        schema: UserRewardsSchema,
      },
      {
        name: GlobalPool.name,
        schema: GlobalPoolSchema,
      },
      {
        name: MachineCounter.name,
        schema: MachineCounterSchema,
      },
      {
        name: ImpersonateHistroty.name,
        schema: ImpersonateHistrotySchema,
      },
      {
        name: Token.name,
        schema: TokenSchema,
      },
      {
        name: CloudKMachineStakeTransaction.name,
        schema: CloudKMachineStakeTransactionSchema,
      },
      {
        name: DepositTransactionHistory.name,
        schema: DepositTransactionHistorySchema,
      },
      {
        name: Burn.name,
        schema: BurnSchema,
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
        name: BurnParticipants.name,
        schema: BurnParticipantsSchema,
      },
      {
        name: Network.name,
        schema: NetworkSchema,
      },
      {
        name: PlatformVoucher.name,
        schema: PlatformVoucherSchema,
      },
      { name: Wallet.name, schema: WalletSchema },
      { name: SNBonusTransaction.name, schema: SNBonusTransactionSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
      {
        name: DepositAndStakeProducts.name,
        schema: DepositAndStakeProductsSchema,
      },
      {
        name: DepositAndStakeTransaction.name,
        schema: DepositAndStakeTransactionSchema,
      },
      {
        name: OnChainWallet.name,
        schema: OnChainWalletSchema,
      },
      {
        name: DepositAndStakeSettings.name,
        schema: DepositAndStakeSettingsSchema,
      },
      {
        name: DepositSetting.name,
        schema: DepositSettingSchema,
      },
      {
        name: DepositTransactionSummary.name,
        schema: DepositTransactionSummarySchema,
      },
      {
        name: WithdrawTransaction.name,
        schema: WithdrawTransactionSchema,
      },
      {
        name: CloudKAutoCompoundSetting.name,
        schema: CloudKAutoCompoundSettingSchema,
      },
      {
        name: NodekRewardFilePath.name,
        schema: NodekRewardFilePathSchema,
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
        name: AdditionalMintingPromotion.name,
        schema: AdditionalMintingPromotionSchema,
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
        name: NewUserStake.name,
        schema: NewUserStakeSchema,
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
        name: UsdkStakeReward.name,
        schema: UsdkStakeRewardSchema,
      },
      {
        name: UsdkStakeTransactionHistory.name,
        schema: UsdkStakeTransactionHistorySchema,
      },
      { name: SwapTransaction.name, schema: SwapTransactionSchema },
      {
        name: SwapTransactionHistory.name,
        schema: SwapTransactionHistorySchema,
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
    forwardRef(() => SupernodeModule),
    HttpModule,
    forwardRef(() => WalletModule),
    TokenModule,
    KMallModule,
    MyBlockchainIdModule,
    EmailModule,
    MyFriendsModule,
    BurnModule,
    GatewayModule, // Add this gateway line
  ],
  controllers: [CloudKController],
  providers: [
    CloudKService,
    CloudKDepositV4Service,
    CloudKRewardService,
    CloudKSimulationService,
    JwtStrategy,
    MyBlockchainIdService,
    CacheService,
    CloudKDepositService,
    BurnService,
    PlatformService,
    KMallService,
    WalletDepositService,
    WebhookService,
    CloudKCommunicationService,
    UsdkStakeService,
    UsdkStakeRewardService,
  ],
  exports: [
    CloudKService,
    CloudKRewardService,
    CloudKSimulationService,
    CloudKDepositService,
  ],
})
export class CloudKModule {}
