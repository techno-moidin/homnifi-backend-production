import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { JwtStrategy } from './strategies/jwt.strategy';
import { EmailModule } from '../email/email.module';
import { OtpTokensModule } from '../otp-tokens/otp-tokens.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { MyBlockchainIdService } from '../my-blockchain-id/my-blockchain-id.service';
import { HttpModule } from '@nestjs/axios';
import { MBID_BASE_URL } from '../my-blockchain-id/my-blockchain-id.routes';
import { WalletModule } from '../wallet/wallet.module';
import { DeviceModule } from '../device/device.module';
import { Device, DeviceSchema } from '../device/schemas/device.schema';
import { NotificationModule } from '../notification/notification.module';
import {
  UserMembership,
  UserMembershipSchema,
} from '../users/schemas/membership.schema';
import {
  ActiveUserTree,
  ActiveUserTreeSchema,
} from '../users/schemas/active-user-tree.schema';
import {
  UserImportJob,
  UserImportJobSchema,
} from '../users/schemas/user-import-job';
import { AdminUserController } from '../admin/controllers/admin.user.controller';
import { AdminLog, AdminLogModel } from '../admin/log/schema/admin.log.schema';
import { AdminService } from '../admin/admin.service';
import { Admin, AdminSchema } from '../admin/schemas/admin.schema';
import { Role, RoleSchema } from '../admin/schemas/role.schema';
import { AdminModule } from '../admin/admin.module';
import {
  ImpersonateHistroty,
  ImpersonateHistrotySchema,
} from '../admin/schemas/impersonate-histroty.schema';
import { ImpersonateService } from '../impersonate/impersonate.service';
import { CacheService } from '../cache/cache.service';
import { CloudKService } from '../cloud-k/cloud-k.service';
import {
  CloudKMachine,
  CloudKMachineSchema,
} from '../cloud-k/schemas/cloudk-machine.schema';
import {
  CloudKSimulationMachine,
  CloudKSimulationMachineSchema,
} from '../cloud-k/schemas/cloudk-simulation-machine.schema';
import {
  CloudKMachineStake,
  CloudKMachineStakeSchema,
} from '../cloud-k/schemas/cloudk-machine-stakes.schema';
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
  MachineCounter,
  MachineCounterSchema,
} from '../cloud-k/schemas/machine-counter.schema';
import { SupernodeService } from '../supernode/supernode.service';
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
import {
  ImpersonateLog,
  ImpersonateLogSchema,
} from '../impersonate/schemas/impersonate-log.schema';
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
import { SNGlogbalPollService } from '../supernode/sn-global-poll.service';
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
} from '../token/schemas/depositAndStackSettings.schema';
import { Platform, PlatformSchema } from '../platform/schemas/platform.schema';
import {
  SpecialSwapSetting,
  SpecialSwapSettingSchema,
} from '@/src/token/schemas/special.swap.settings.schema';
import { PlatformService } from '../platform/platform.service';
import {
  EnrolledPlatform,
  EnrolledPlatformSchema,
} from '../platform/schemas/enrolled-platform.schema';
import { PlatformAds, PlatformAdsSchema } from '../platform/schemas/ads.schema';
import {
  FavoritePlatform,
  FavoritePlatformSchema,
} from '../platform/schemas/favorite-platform.schema';
import {
  CloudKMachineStakeTransaction,
  CloudKMachineStakeTransactionSchema,
} from '../cloud-k/schemas/stake-history.schema';
import { KMallService } from '../k-mall/kmall.service';
import {
  PlatformVoucher,
  PlatformVoucherSchema,
} from '../platform-voucher/schemas/platform-voucher.schema';
import { GatewayService } from '../gateway/gateway.service';
import {
  DepositTransactionSummary,
  DepositTransactionSummarySchema,
} from '../wallet/schemas/deposit.summary.schema';
import {
  WithdrawSummary,
  WithdrawSummarySchema,
} from '../wallet/schemas/withdraw.summary.schema';
import { Wallet, WalletSchema } from '../wallet/schemas/wallet.schema';
import { WebhookModule } from '../webhook/webhook.module';
import {
  OnChainWalletSetting,
  OnChainWalletSettingSchema,
} from '../token/schemas/on.chain.wallet.setting.schema';
import {
  OnChainAttempt,
  OnChainAttemptSchema,
} from '../token/schemas/on.chain.attempt.schema';
import { UserRewards, UserRewardsSchema } from '../users/schemas/user-rewards';
import { SupernodeSummaryService } from '../supernode/supernode.summary.service';
import { WalletGatewayService } from '../wallet-gateway/wallet-gateway.service';
import {
  WalletGatewayTransaction,
  WalletGatewayTransactionSchema,
} from '../wallet-gateway/schemas/wallet-gateway.transaction.schema';
import {
  UserAnalyticsLog,
  UserAnalyticsLogSchema,
} from '../users/schemas/user-analytics-log.schema';
import { TwoAccessService } from '../two-access/two-access.service';
import { TelegramService } from '../telegram/telegram.service';
import {
  CloudKAutoCompoundSetting,
  CloudKAutoCompoundSettingSchema,
} from '../cloud-k/schemas/cloudk-autoCompound-setting.schema';
import {
  AdditionalMintingPromotion,
  AdditionalMintingPromotionSchema,
} from '../admin/schemas/additional-minting-promotion.schema';
import {
  UserBlockAdminLogs,
  UserBlockAdminLogsSchema,
} from '../admin/schemas/user.block.admin.schema';
import {
  GenExtraRewardHistory,
  GenExtraRewardHistorySchema,
} from '../cloud-k/schemas/gen-extra-reward-history.schema';
import { CountriesService } from '../countries/countries.service';
import { Country, CountrySchema } from '../countries/schemas/country.schema';
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
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: ActiveUserTree.name, schema: ActiveUserTreeSchema },
      { name: UserMembership.name, schema: UserMembershipSchema },
      { name: Device.name, schema: DeviceSchema },
      { name: UserImportJob.name, schema: UserImportJobSchema },
      { name: Admin.name, schema: AdminSchema },
      { name: Role.name, schema: RoleSchema },
      { name: AdminLog.name, schema: AdminLogModel },
      { name: ImpersonateHistroty.name, schema: ImpersonateHistrotySchema },
      { name: CloudKMachine.name, schema: CloudKMachineSchema },
      { name: CloudKSetting.name, schema: CloudKSettingSchema },
      { name: CloudKProduct.name, schema: CloudKProductSchema },
      { name: CloudKDailyJob.name, schema: CloudKDailyJobSchema },
      { name: CloudKTransactions.name, schema: CloudKTransactionsSchema },
      { name: CloudKOverrideBoost.name, schema: CloudKOverrideBoostSchema },
      { name: UserGask.name, schema: UserGaskSchema },
      { name: GlobalPool.name, schema: GlobalPoolSchema },
      { name: SuperNodeGaskSetting.name, schema: SuperNodeGaskSettingSchema },
      { name: CloudKKillSetting.name, schema: CloudKKillSettingSchema },
      { name: MachineCounter.name, schema: MachineCounterSchema },
      { name: Token.name, schema: TokenSchema },
      { name: TokenSetting.name, schema: TokenSettingSchema },
      { name: Network.name, schema: NetworkSchema },
      { name: SwapSetting.name, schema: SwapSettingSchema },
      { name: SpecialSwapSetting.name, schema: SpecialSwapSettingSchema },
      { name: DepositSetting.name, schema: DepositSettingSchema },
      { name: WithdrawSetting.name, schema: WithdrawSettingSchema },
      { name: WithdrawSetting.name, schema: TokenATHPriceSchema },
      { name: TokenATHPrice.name, schema: TokenATHPriceSchema },
      { name: BaseReferralSetting.name, schema: BaseReferralSettingSchema },
      { name: BaseReferralLevelSetting.name, schema: BaseReferralLevelSchema },
      { name: SNBonusTransaction.name, schema: SNBonusTransactionSchema },
      { name: SnSetting.name, schema: SnSettingSchema },
      { name: ImpersonateHistroty.name, schema: ImpersonateHistrotySchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
      { name: DepositTransaction.name, schema: DepositTransactionSchema },
      { name: WithdrawTransaction.name, schema: WithdrawTransactionSchema },
      { name: SwapTransaction.name, schema: SwapTransactionSchema },
      { name: Wallet.name, schema: WalletSchema },
      {
        name: WalletGatewayTransaction.name,
        schema: WalletGatewayTransactionSchema,
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
        name: MyFriendsProductPurhcaseBonusSetting.name,
        schema: MyFriendsProductPurhcaseBonusSettingSchema,
      },
      {
        name: MyFriendsBonusTransaction.name,
        schema: MyFriendsBonusTransactionSchema,
      },
      {
        name: CloudKGlobalAutoCompound.name,
        schema: CloudKGlobalAutoCompoundSchema,
      },
      {
        name: CloudKSimulationMachine.name,
        schema: CloudKSimulationMachineSchema,
      },
      {
        name: CloudKMachineStake.name,
        schema: CloudKMachineStakeSchema,
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
        name: ImpersonateLog.name,
        schema: ImpersonateLogSchema,
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
        name: CloudKMachineStakeTransaction.name,
        schema: CloudKMachineStakeTransactionSchema,
      },
      {
        name: PlatformVoucher.name,
        schema: PlatformVoucherSchema,
      },
      {
        name: UserRewards.name,
        schema: UserRewardsSchema,
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
      { name: Wallet.name, schema: WalletSchema },
      { name: UserAnalyticsLog.name, schema: UserAnalyticsLogSchema },
      {
        name: CloudKAutoCompoundSetting.name,
        schema: CloudKAutoCompoundSettingSchema,
      },
      {
        name: AdditionalMintingPromotion.name,
        schema: AdditionalMintingPromotionSchema,
      },
      { name: UserBlockAdminLogs.name, schema: UserBlockAdminLogsSchema },
      {
        name: GenExtraRewardHistory.name,
        schema: GenExtraRewardHistorySchema,
      },
      {
        name: Country.name,
        schema: CountrySchema,
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
    EmailModule,
    OtpTokensModule,
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
      baseURL: MBID_BASE_URL,
    }),
    WalletModule,
    DeviceModule,
    NotificationModule,
    AdminModule,
    WebhookModule,
  ],
  controllers: [AuthController, AdminUserController],
  providers: [
    AuthService,
    JwtStrategy,
    UsersService,
    MyBlockchainIdService,
    ImpersonateService,
    CacheService,
    CloudKService,
    TokenService,
    MyFriendsService,
    SupernodeService,
    SNGlogbalPollService,
    PlatformService,
    KMallService,
    GatewayService,
    SupernodeSummaryService,
    WalletGatewayService,
    TwoAccessService,
    TelegramService,
    CountriesService,
  ],
})
export class AuthModule {}
