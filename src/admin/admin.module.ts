import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { CloudKModule } from '../cloud-k/cloud-k.module';
import { TokenModule } from '../token/token.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { UsersModule } from '../users/users.module';
import { JWT_SECRET_ADMIN } from '../utils/constants';
import { WalletModule } from '../wallet/wallet.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAuthController } from './auth/admin.auth.controller';
import { AdminAuthService } from './auth/admin.auth.service';
import { AdminCloudKController } from './controllers/admin.cloudk.controller';
import { AdminTokenController } from './controllers/admin.token.controller';
import { AdminWalletController } from './controllers/admin.wallet.controller';
import { Admin, AdminSchema } from './schemas/admin.schema';
import { Role, RoleSchema } from './schemas/role.schema';
import { AdminGuard } from './auth/guards/admin.guard';
import { AdminFaqController } from './controllers/admin.faq.controller';
import { FaqModule } from '../faq/faq.module';
import { AdminMaintenanceController } from './controllers/admin.maintenance.controller';
import { MaintenanceModule } from '../maintenance/maintenance.module';
import { AdminPlatformController } from './controllers/admin.platform.controller';
import { PlatformModule } from '../platform/platform.module';
import {
  WebhookStatus,
  WebhookStatusSchema,
} from './schemas/webhook-error.schema';
import { WebhookController } from './controllers/admin.webhooks.controller';
import { NotificationModule } from '../notification/notification.module';
import {
  Notification,
  NotificationSchema,
} from '../notification/schemas/notification.schema';
import { AdminNotificationController } from './controllers/admin.notification.controller';
import { AdminSupportController } from './controllers/admin.support.controller';
import { SupportModule } from '../support/support.module';
import { EmailModule } from '../email/email.module';
import { AdminSupernodeController } from './controllers/admin.supernode.controller';
import { SupernodeService } from '../supernode/supernode.service';
import { SupernodeModule } from '../supernode/supernode.module';
import { TasksService } from '../tasks/tasks.service';
import { AdminNewsController } from './controllers/admin.news.controller';
import { News, NewsSchema } from '../news/schemas/news.schema';
import { AdminLogModule } from './log/admin.log.module';
import { AdminLog, AdminLogModel } from './log/schema/admin.log.schema';
import { GatewayService } from '../gateway/gateway.service';
import { AdminOtpTokensModule } from './admin-otp-token/admin-otp-tokens.module';
import { AdminUserController } from './controllers/admin.user.controller';
import { MyBlockchainIdService } from '../my-blockchain-id/my-blockchain-id.service';
import { HttpModule } from '@nestjs/axios';
import { AuthModule } from '../auth/auth.module';
import { AuthService } from '../auth/auth.service';
import { OtpTokensService } from '../otp-tokens/otp-tokens.service';
import { DeviceService } from '../device/device.service';
import {
  OtpTokens,
  OtpTokensSchema,
} from '../otp-tokens/schemas/otp-tokens.schema';
import { Device, DeviceSchema } from '../device/schemas/device.schema';
import {
  ImpersonateHistroty,
  ImpersonateHistrotySchema,
} from '../admin/schemas/impersonate-histroty.schema';
import { CacheService } from '../cache/cache.service';
import { ImpersonateService } from '../impersonate/impersonate.service';
import {
  ImpersonateLog,
  ImpersonateLogSchema,
} from '../impersonate/schemas/impersonate-log.schema';
import {
  DatabaseDump,
  DatabaseDumpSchema,
} from './schemas/database-dump.schema';
import {
  UserGask,
  UserGaskSchema,
} from '../supernode/schemas/user-gask.schema';
import { TwoFAService } from './auth/admin-2fa.service';
import { Burn, BurnSchema } from '../burn/schema/burn.schema';
import { AdminBunController } from './controllers/admin.burn.controller';
import { BurnService } from '../burn/burn.service';
import { BurnModule } from '../burn/burn.module';
import {
  DepositAndStakeSettings,
  DepositAndStakeSettingsSchema,
} from '../token/schemas/depositAndStackSettings.schema';
import { CountriesModule } from '@/src/countries/countries.module';

import {
  WithdrawTransaction,
  WithdrawTransactionSchema,
} from '../wallet/schemas/withdraw.transaction.schema';
import {
  CloudKMachine,
  CloudKMachineSchema,
} from '../cloud-k/schemas/cloudk-machine.schema';
import {
  WalletTransaction,
  WalletTransactionSchema,
} from '../wallet/schemas/wallet.transaction.schema.';
import {
  DepositTransaction,
  DepositTransactionSchema,
} from '../wallet/schemas/deposit.transaction.schema';
import {
  SwapTransaction,
  SwapTransactionSchema,
} from '../wallet/schemas/swap.transaction.schema';
import {
  CloudKReward,
  CloudKRewardSchema,
} from '../cloud-k/schemas/cloudk-reward.schema';

import {
  BurnParticipants,
  BurnParticipantsSchema,
} from '../burn/schema/burn.participant.schema';
import { Token, TokenSchema } from '../token/schemas/token.schema';
import {
  CloudKSetting,
  CloudKSettingSchema,
} from '../cloud-k/schemas/cloudk-setting.schema';
import { AdminDashboardController } from './controllers/admin.dashboard.controller';
import {
  SNBonusTransaction,
  SNBonusTransactionSchema,
} from '../supernode/schemas/sn-bonus-transaction.schema';
import { AdminPlatformVoucherController } from './controllers/admin.platform-voucher.controller';
import { PlatformVoucherService } from '../platform-voucher/platform-voucher.service';
import {
  PlatformVoucher,
  PlatformVoucherSchema,
} from '../platform-voucher/schemas/platform-voucher.schema';
import { EncryptionService } from '../encryption/encryption.service';
import { EncryptionController } from '../encryption/encryption.controller';
import { KMallService } from '../k-mall/kmall.service';
import { Network, NetworkSchema } from '../token/schemas/network.schema';
import { AdminSupernodePoolController } from './controllers/admin.pool.controller';
import { AdminTierController } from './controllers/admin.tier.setting.controller';
import { AdminWalletService } from './admin.wallet.services';
import { AdminCloudkService } from './admin.cloudk.service';
import { Platform, PlatformSchema } from '../platform/schemas/platform.schema';
import {
  SpecialSwapTransaction,
  SpecialSwapTransactionSchema,
} from '../wallet/schemas/special.swap.transaction.schema';
import {
  CloudKTransactions,
  CloudKTransactionsSchema,
} from '../cloud-k/schemas/cloudk-transactions.schema';
import { Wallet, WalletSchema } from '../wallet/schemas/wallet.schema';
import { WalletGatewayService } from '../wallet-gateway/wallet-gateway.service';
import {
  WalletGatewayTransaction,
  WalletGatewayTransactionSchema,
} from '../wallet-gateway/schemas/wallet-gateway.transaction.schema';
import {
  WithdrawSetting,
  WithdrawSettingSchema,
} from '../token/schemas/withdraw.settings.schema';
import { TelegramService } from '../telegram/telegram.service';
import { AdminSupernodeService } from '../supernode/admin.supernode.service';
import {
  BaseReferralSetting,
  BaseReferralSettingSchema,
} from '../supernode/schemas/base-referral-setting.schema';
import {
  BaseReferralLevelSchema,
  BaseReferralLevelSetting,
} from '../supernode/schemas/base-referral-level-settings.schema';
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
  SupernodeAdminLog,
  SupernodeAdminLogsSchema,
} from './schemas/admin.supernode.logs.schema';
import { WallekStakeModule } from '../wallek-stake/wallek-stake.module';
import {
  CloudKMachineStake,
  CloudKMachineStakeSchema,
} from '../cloud-k/schemas/cloudk-machine-stakes.schema';

import { SupernodeSummaryService } from '../supernode/supernode.summary.service';
import { TwoAccessService } from '../two-access/two-access.service';
// import {
//   WebhookUploadRewardFile,
//   WebhookUploadRewardFileSchema,
// } from '../webhook/schemas/webhookUploadRewardFile';
import { UserRewards, UserRewardsSchema } from '../users/schemas/user-rewards';
import {
  CloudKProduct,
  CloudKProductSchema,
} from '../cloud-k/schemas/cloudk-products.schema';
import {
  UserBlockAdminLogs,
  UserBlockAdminLogsSchema,
} from './schemas/user.block.admin.schema';
import { BullmqService } from '../bullmq/bullmq.service';
import { BullModule } from '@nestjs/bullmq';
import { QueueNames } from '../bullmq/enums/queue-names.enum';
import { CountriesService } from '../countries/countries.service';
import { Country, CountrySchema } from '../countries/schemas/country.schema';
import {
  UserTeamMachineStakes,
  UserTeamMachineStakesSchema,
} from '../supernode/schemas/user-team-machine-stacks.schema';
import {
  AdditionalMintingPromotion,
  AdditionalMintingPromotionSchema,
} from './schemas/additional-minting-promotion.schema';
import {
  AdditionalCountryLevelSetting,
  AdditionalCountryLevelSettingSchema,
} from './schemas/additional.product.minting.Schema';
import {
  WebhookUploadRewardFile,
  WebhookUploadRewardFileSchema,
} from '../webhook/schemas/webhookUploadRewardFile';

import { AdminTbalanceControllerController } from './controllers/admin.tbalance.controller';
import { AdminUsdstakeController } from './controllers/admin.usdstake.controller';
import { UsdkStakeService } from '../usdk-stake/usdk-stake.service';
import {
  UsdkStakeSettings,
  UsdkStakeSettingsSchema,
} from '../usdk-stake/schemas/usdkStakeSettings.schema';
import {
  UsdkStakeTransactions,
  UsdkStakeTransactionsSchema,
} from '../usdk-stake/schemas/usdkStakeTransaction.schema';
import { UsdkStakeRewardService } from '../usdk-stake/usdk-stake-reward.service';
import {
  UsdkStakeReward,
  UsdkStakeRewardSchema,
} from '../usdk-stake/schemas/usdkStakeReward.schema';
import {
  UsdkStakeTransactionHistory,
  UsdkStakeTransactionHistorySchema,
} from '../usdk-stake/schemas/usdkStakeTransactionHistory';
import {
  UsdkStakeGlobalAutoCompound,
  UsdkStakeGlobalAutoCompoundSchema,
} from '../usdk-stake/schemas/usdkstake-global-auto-compund.schema';

import {
  InactiveAdditionalCountryLevelSetting,
  InactiveAdditionalCountryLevelSettingSchema,
} from './schemas/inactive-additional.product.minting.Schema';
import {
  QueueJobLog,
  QueueJobLogSchema,
} from '../bullmq/schemas/queue-job-log.schema';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>(JWT_SECRET_ADMIN),
        signOptions: { expiresIn: '24h' },
      }),
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserRewards.name, schema: UserRewardsSchema },
    ]),
    MongooseModule.forFeature([
      { name: Admin.name, schema: AdminSchema },
      { name: Role.name, schema: RoleSchema },
      { name: DatabaseDump.name, schema: DatabaseDumpSchema },
      { name: WebhookStatus.name, schema: WebhookStatusSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: News.name, schema: NewsSchema },
      { name: AdminLog.name, schema: AdminLogModel },
      { name: OtpTokens.name, schema: OtpTokensSchema },
      { name: Device.name, schema: DeviceSchema },
      { name: ImpersonateHistroty.name, schema: ImpersonateHistrotySchema },
      { name: UserGask.name, schema: UserGaskSchema },
      { name: WithdrawSetting.name, schema: WithdrawSettingSchema },
      {
        name: WalletGatewayTransaction.name,
        schema: WalletGatewayTransactionSchema,
      },
      {
        name: ImpersonateLog.name,
        schema: ImpersonateLogSchema,
      },
      {
        name: Network.name,
        schema: NetworkSchema,
      },
      {
        name: Burn.name,
        schema: BurnSchema,
      },
      {
        name: CloudKSetting.name,
        schema: CloudKSettingSchema,
      },
      {
        name: Token.name,
        schema: TokenSchema,
      },
      {
        name: DepositAndStakeSettings.name,
        schema: DepositAndStakeSettingsSchema,
      },
      {
        name: Token.name,
        schema: TokenSchema,
      },
      {
        name: WithdrawTransaction.name,
        schema: WithdrawTransactionSchema,
      },
      {
        name: CloudKMachine.name,
        schema: CloudKMachineSchema,
      },
      {
        name: WalletTransaction.name,
        schema: WalletTransactionSchema,
      },
      {
        name: DepositTransaction.name,
        schema: DepositTransactionSchema,
      },
      {
        name: Platform.name,
        schema: PlatformSchema,
      },
      {
        name: SpecialSwapTransaction.name,
        schema: SpecialSwapTransactionSchema,
      },
      {
        name: CloudKTransactions.name,
        schema: CloudKTransactionsSchema,
      },

      {
        name: SwapTransaction.name,
        schema: SwapTransactionSchema,
      },
      {
        name: CloudKReward.name,
        schema: CloudKRewardSchema,
      },
      {
        name: CloudKMachine.name,
        schema: CloudKMachineSchema,
      },
      {
        name: BurnParticipants.name,
        schema: BurnParticipantsSchema,
      },
      {
        name: SNBonusTransaction.name,
        schema: SNBonusTransactionSchema,
      },
      {
        name: PlatformVoucher.name,
        schema: PlatformVoucherSchema,
      },
      {
        name: CloudKTransactions.name,
        schema: CloudKTransactionsSchema,
      },
      {
        name: Wallet.name,
        schema: WalletSchema,
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
        name: SupernodeAdminLog.name,
        schema: SupernodeAdminLogsSchema,
      },
      {
        name: CloudKMachineStake.name,
        schema: CloudKMachineStakeSchema,
      },
      {
        name: AdditionalMintingPromotion.name,
        schema: AdditionalMintingPromotionSchema,
      },
      {
        name: WebhookUploadRewardFile.name,
        schema: WebhookUploadRewardFileSchema,
      },
      {
        name: WebhookUploadRewardFile.name,
        schema: WebhookUploadRewardFileSchema,
      },
      {
        name: UserRewards.name,
        schema: UserRewardsSchema,
      },
      {
        name: CloudKProduct.name,
        schema: CloudKProductSchema,
      },
      { name: UserBlockAdminLogs.name, schema: UserBlockAdminLogsSchema },
      { name: Country.name, schema: CountrySchema },
      {
        name: UserTeamMachineStakes.name,
        schema: UserTeamMachineStakesSchema,
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
        name: UserBlockAdminLogs.name,
        schema: UserBlockAdminLogsSchema,
      },
      { name: QueueJobLog.name, schema: QueueJobLogSchema },

      { name: UsdkStakeSettings.name, schema: UsdkStakeSettingsSchema },
      { name: UsdkStakeTransactions.name, schema: UsdkStakeTransactionsSchema },
      {
        name: UsdkStakeReward.name,
        schema: UsdkStakeRewardSchema,
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
    UsersModule,
    WalletModule,
    CloudKModule,
    TokenModule,
    CountriesModule,
    FaqModule,
    MaintenanceModule,
    PlatformModule,
    NotificationModule,
    SupportModule,
    EmailModule,
    SupernodeModule,
    AdminLogModule,
    AdminOtpTokensModule,
    HttpModule,
    BurnModule,
    WallekStakeModule,
    ...Object.values(QueueNames).map((queueName) =>
      BullModule.registerQueue({
        name: queueName,
      }),
    ),
  ],
  controllers: [
    AdminController,
    AdminAuthController,
    AdminWalletController,
    AdminCloudKController,
    AdminTokenController,
    AdminFaqController,
    AdminMaintenanceController,
    AdminPlatformController,
    WebhookController,
    AdminNotificationController,
    AdminSupportController,
    AdminSupernodeController,
    AdminNewsController,
    AdminUserController,
    AdminBunController,
    AdminDashboardController,
    AdminPlatformVoucherController,
    EncryptionController,
    AdminSupernodePoolController,
    AdminTierController,
    AdminTbalanceControllerController,
    AdminUsdstakeController,
  ],
  providers: [
    AdminService,
    AdminAuthService,
    TasksService,
    AdminGuard,
    GatewayService,
    MyBlockchainIdService,
    AuthService,
    OtpTokensService,
    DeviceService,
    CacheService,
    ImpersonateService,
    TwoFAService,
    BurnService,
    PlatformVoucherService,
    EncryptionService,
    KMallService,
    AdminWalletService,
    AdminCloudkService,
    WalletGatewayService,
    TelegramService,
    AdminSupernodeService,
    SupernodeSummaryService,
    TwoAccessService,
    BullmqService,
    CountriesService,
    UsdkStakeService,
    UsdkStakeRewardService,
  ],
  exports: [
    AdminService,
    AdminGuard,
    AdminAuthService,
    AdminWalletService,
    AdminCloudkService,
  ],
})
export class AdminModule {}
