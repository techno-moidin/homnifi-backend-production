import { forwardRef, Module } from '@nestjs/common';
import { SupernodeService } from './supernode.service';
import { SupernodeController } from './supernode.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { UserGask, UserGaskSchema } from './schemas/user-gask.schema';
import {
  SNBonusTransaction,
  SNBonusTransactionSchema,
} from './schemas/sn-bonus-transaction.schema';
import {
  BaseReferralLevelSetting,
  BaseReferralLevelSchema,
} from './schemas/base-referral-level-settings.schema';
import {
  ActiveUserTree,
  ActiveUserTreeSchema,
} from '../users/schemas/active-user-tree.schema';
import {
  SuperNodeGaskSetting,
  SuperNodeGaskSettingSchema,
} from './schemas/sn-gask-setting.schema';
import {
  BaseReferralSetting,
  BaseReferralSettingSchema,
} from './schemas/base-referral-setting.schema';
import { CloudKModule } from '../cloud-k/cloud-k.module';
import {
  CloudKReward,
  CloudKRewardSchema,
} from '../cloud-k/schemas/cloudk-reward.schema';
import { GlobalPool, GlobalPoolSchema } from './schemas/sn-global-pool.schema';
import { CloudKService } from '../cloud-k/cloud-k.service';
import {
  CloudKMachine,
  CloudKMachineSchema,
} from '../cloud-k/schemas/cloudk-machine.schema';
import { BaseReferralRewardService } from './base-referral-generate.service';
import { TokenService } from '../token/token.service';
import { TokenModule } from '../token/token.module';
import { SnSetting, SnSettingSchema } from './schemas/sn-settings.schema';
import { WalletModule } from '../wallet/wallet.module';
import {
  BuilderGenerationSetting,
  BuilderGenerationSettingSchema,
} from './schemas/builder-generation-settings';
import {
  BuilderGenerationLevelSetting,
  BuilderGenerationLevelSettingSchema,
} from './schemas/builder-generation-level-settings.schema';
import { BuilderGenerationalRewardService } from './builder-generation.service';
import { BuilderReferralService } from './builder-referral.service';
import {
  BuilderReferralData,
  BuilderReferralDataSchema,
} from './schemas/builder-referral-data.schema';
import {
  BuilderReferralSetting,
  BuilderReferralSettingSchema,
} from './schemas/builder-referral-settings.schema';
import { CacheModule } from '@nestjs/cache-manager';
import { CacheService } from '../cache/cache.service';
import {
  CloudKTransactions,
  CloudKTransactionsSchema,
} from '../cloud-k/schemas/cloudk-transactions.schema';
import { SNGlogbalPollService } from './sn-global-poll.service';
import { Sngp, SngpSchema } from './schemas/sngp.schema';
import { SngpRewards, SngpRewardsSchema } from './schemas/sngp-rewards.schema';
import { UserSngp, UserSngpSchema } from './schemas/user-sngp.schema';
import {
  SngpDistribution,
  SngpDistributionSchema,
} from './schemas/sngp-distribution.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import {
  CloudKProduct,
  CloudKProductSchema,
} from '../cloud-k/schemas/cloudk-products.schema';
import { Token, TokenSchema } from '../token/schemas/token.schema';
import { SNGlogbalPollAdminService } from './sn-global-poll.admin.service';
import { SNGlobalClaimService } from './sn-global-pool-claim-service';
import {
  CloudKSetting,
  CloudKSettingSchema,
} from '../cloud-k/schemas/cloudk-setting.schema';
import { TierService } from './tier.service';
import {
  TierLevelSetting,
  TierLevelSettingSchema,
} from './schemas/tier-level-settings.schema';
import { TierSetting, TierSettingSchema } from './schemas/tier-setting.schema';
import { UserRewards, UserRewardsSchema } from '../users/schemas/user-rewards';
import { SupernodeSummaryController } from './supernode.summary.controller';
import { SupernodeSummaryService } from './supernode.summary.service';
import { Wallet, WalletSchema } from '../wallet/schemas/wallet.schema';
import { AdminSupernodeService } from './admin.supernode.service';
import { CloudKMachineStake } from '../cloud-k/schemas/cloudk-machine-stakes.schema';
import { TwoAccessService } from '../two-access/two-access.service';
import { SupernodeLeaderBoardController } from './supernode.leaderboard.controller';
import { SupernodeLeaderService } from './supernode.leaderboard.service';
import {
  UserTeamMachineStakes,
  UserTeamMachineStakesSchema,
} from './schemas/user-team-machine-stacks.schema';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserGask.name, schema: UserGaskSchema },
      { name: User.name, schema: UserSchema },
      { name: SNBonusTransaction.name, schema: SNBonusTransactionSchema },
      { name: BaseReferralSetting.name, schema: BaseReferralSettingSchema },
      { name: BaseReferralLevelSetting.name, schema: BaseReferralLevelSchema },
      { name: ActiveUserTree.name, schema: ActiveUserTreeSchema },
      { name: SuperNodeGaskSetting.name, schema: SuperNodeGaskSettingSchema },
      { name: CloudKReward.name, schema: CloudKRewardSchema },
      { name: GlobalPool.name, schema: GlobalPoolSchema },
      { name: SnSetting.name, schema: SnSettingSchema },
      { name: CloudKMachine.name, schema: CloudKMachineSchema },
      { name: CloudKProduct.name, schema: CloudKProductSchema },
      { name: Wallet.name, schema: WalletSchema },

      {
        name: BuilderGenerationSetting.name,
        schema: BuilderGenerationSettingSchema,
      },
      {
        name: BuilderGenerationLevelSetting.name,
        schema: BuilderGenerationLevelSettingSchema,
      },
      { name: BuilderReferralData.name, schema: BuilderReferralDataSchema },
      {
        name: BuilderReferralSetting.name,
        schema: BuilderReferralSettingSchema,
      },
      {
        name: CloudKTransactions.name,
        schema: CloudKTransactionsSchema,
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
        name: Token.name,
        schema: TokenSchema,
      },
      {
        name: CloudKSetting.name,
        schema: CloudKSettingSchema,
      },
      {
        name: TierLevelSetting.name,
        schema: TierLevelSettingSchema,
      },
      {
        name: TierSetting.name,
        schema: TierSettingSchema,
      },
      {
        name: UserRewards.name,
        schema: UserRewardsSchema,
      },
      {
        name: CloudKMachineStake.name,
        schema: UserRewardsSchema,
      },
      {
        name: UserTeamMachineStakes.name,
        schema: UserTeamMachineStakesSchema,
      },
    ]),
    TokenModule,
    forwardRef(() => WalletModule),
    forwardRef(() => CloudKModule),
  ],
  controllers: [
    SupernodeController,
    SupernodeSummaryController,
    SupernodeLeaderBoardController,
  ],
  providers: [
    SupernodeService,
    BaseReferralRewardService,
    BuilderGenerationalRewardService,
    BuilderReferralService,
    CacheService,
    SNGlogbalPollService,
    SNGlogbalPollAdminService,
    SNGlobalClaimService,
    TierService,
    SupernodeSummaryService,
    AdminSupernodeService,
    TwoAccessService,
    SupernodeLeaderService,
    TwoAccessService,
  ],
  exports: [
    SupernodeService,
    BaseReferralRewardService,
    BuilderGenerationalRewardService,
    BuilderReferralService,
    SNGlogbalPollService,
    SNGlogbalPollAdminService,
    SNGlobalClaimService,
    TierService,
    SupernodeLeaderService,
  ],
})
export class SupernodeModule {}
