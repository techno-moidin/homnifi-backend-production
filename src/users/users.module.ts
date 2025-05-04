import { Global, Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { WalletModule } from '../wallet/wallet.module';
import { UserController } from './users.controller';
import {
  UserMembership,
  UserMembershipSchema,
} from './schemas/membership.schema';
import {
  ActiveUserTree,
  ActiveUserTreeSchema,
} from './schemas/active-user-tree.schema';
import { UserImportJob, UserImportJobSchema } from './schemas/user-import-job';
import {
  ImpersonateHistroty,
  ImpersonateHistrotySchema,
} from '../admin/schemas/impersonate-histroty.schema';
import { HttpModule } from '@nestjs/axios';
import { WebhookModule } from '../webhook/webhook.module';
import {
  CloudKMachine,
  CloudKMachineSchema,
} from '../cloud-k/schemas/cloudk-machine.schema';
import { UserRewards, UserRewardsSchema } from './schemas/user-rewards';
import {
  UserTwoAccess,
  UserTwoAccessSchema,
} from './schemas/user-twoAccess.schema';
import {
  UserAnalyticsLog,
  UserAnalyticsLogSchema,
} from './schemas/user-analytics-log.schema';
import { TwoAccessService } from '../two-access/two-access.service';
import {
  UserTeamMachineStakes,
  UserTeamMachineStakesSchema,
} from '../supernode/schemas/user-team-machine-stacks.schema';
import {
  UserBlockAdminLogs,
  UserBlockAdminLogsSchema,
} from '../admin/schemas/user.block.admin.schema';
import { DeviceService } from '../device/device.service';
import { DeviceModule } from '../device/device.module';
import { Device, DeviceSchema } from '../device/schemas/device.schema';
import {
  CloudKMachineStake,
  CloudKMachineStakeSchema,
} from '../cloud-k/schemas/cloudk-machine-stakes.schema';
import {
  SNBonusTransaction,
  SNBonusTransactionSchema,
} from '../supernode/schemas/sn-bonus-transaction.schema';

@Global()
@Module({
  imports: [
    // MongooseModule.forFeatureAsync([
    //   {
    //     name: User.name,
    //     useFactory: () => {
    //       const schema = UserSchema;
    //       return schema;
    //     },
    //   },
    // ]),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserTwoAccess.name, schema: UserTwoAccessSchema },
      { name: UserMembership.name, schema: UserMembershipSchema },
      { name: ActiveUserTree.name, schema: ActiveUserTreeSchema },
      { name: UserImportJob.name, schema: UserImportJobSchema },
      { name: ImpersonateHistroty.name, schema: ImpersonateHistrotySchema },
      { name: CloudKMachine.name, schema: CloudKMachineSchema },
      { name: UserRewards.name, schema: UserRewardsSchema },
      { name: UserAnalyticsLog.name, schema: UserAnalyticsLogSchema },
      { name: UserTeamMachineStakes.name, schema: UserTeamMachineStakesSchema },
      { name: UserBlockAdminLogs.name, schema: UserBlockAdminLogsSchema },
      { name: Device.name, schema: DeviceSchema },
      { name: CloudKMachineStake.name, schema: CloudKMachineStakeSchema },
      { name: SNBonusTransaction.name, schema: SNBonusTransactionSchema },
      { name: CloudKMachineStake.name, schema: CloudKMachineStakeSchema },
      { name: SNBonusTransaction.name, schema: SNBonusTransactionSchema },
      { name: CloudKMachine.name, schema: CloudKMachineSchema },
    ]),
    WalletModule,
    HttpModule,
    WebhookModule,
    DeviceModule,
  ],
  providers: [UsersService, TwoAccessService, DeviceService],
  exports: [UsersService],
  controllers: [UserController],
})
export class UsersModule {}
