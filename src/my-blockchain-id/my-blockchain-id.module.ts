import { Module } from '@nestjs/common';
import { MyBlockchainIdService } from './my-blockchain-id.service';
import { HttpModule } from '@nestjs/axios';
import { MBID_BASE_URL } from './my-blockchain-id.routes';
import { UsersService } from '../users/users.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { WalletModule } from '../wallet/wallet.module';
import { ConfigModule } from '@nestjs/config';
import { EmailModule } from '../email/email.module';
import {
  UserMembership,
  UserMembershipSchema,
} from '../users/schemas/membership.schema';
import {
  ActiveUserTree,
  ActiveUserTreeSchema,
} from '../users/schemas/active-user-tree.schema';
import { SupernodeModule } from '../supernode/supernode.module';
import { UsersModule } from '../users/users.module';
import {
  UserImportJob,
  UserImportJobSchema,
} from '../users/schemas/user-import-job';
import { CacheService } from '../cache/cache.service';
import { WebhookModule } from '../webhook/webhook.module';
import {
  UserAnalyticsLog,
  UserAnalyticsLogSchema,
} from '../users/schemas/user-analytics-log.schema';
import { TwoAccessService } from '../two-access/two-access.service';
import { UserRewards, UserRewardsSchema } from '../users/schemas/user-rewards';
import {
  UserBlockAdminLogs,
  UserBlockAdminLogsSchema,
} from '../admin/schemas/user.block.admin.schema';
import { Device, DeviceSchema } from '../device/schemas/device.schema';
import { DeviceService } from '../device/device.service';
import {
  CloudKMachine,
  CloudKMachineSchema,
} from '../cloud-k/schemas/cloudk-machine.schema';

import {
  SNBonusTransaction,
  SNBonusTransactionSchema,
} from '../supernode/schemas/sn-bonus-transaction.schema';

import {
  CloudKMachineStake,
  CloudKMachineStakeSchema,
} from '../cloud-k/schemas/cloudk-machine-stakes.schema';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
      baseURL: MBID_BASE_URL,
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserMembership.name, schema: UserMembershipSchema },
      { name: ActiveUserTree.name, schema: ActiveUserTreeSchema },
      { name: UserImportJob.name, schema: UserImportJobSchema },
      { name: UserAnalyticsLog.name, schema: UserAnalyticsLogSchema },
      { name: UserRewards.name, schema: UserRewardsSchema }, // ✅ Added here
      { name: UserBlockAdminLogs.name, schema: UserBlockAdminLogsSchema },
      { name: Device.name, schema: DeviceSchema },
      { name: CloudKMachine.name, schema: CloudKMachineSchema },
      { name: CloudKMachineStake.name, schema: CloudKMachineStakeSchema },
      { name: SNBonusTransaction.name, schema: SNBonusTransactionSchema },
      { name: CloudKMachineStake.name, schema: CloudKMachineStakeSchema },
      { name: SNBonusTransaction.name, schema: SNBonusTransactionSchema },
      { name: CloudKMachine.name, schema: CloudKMachineSchema },
    ]),
    UsersModule,
    WalletModule,
    EmailModule,
    SupernodeModule,
    WebhookModule,
  ],
  providers: [
    MyBlockchainIdService,
    UsersService,
    CacheService,
    TwoAccessService,
    DeviceService,
  ],
  exports: [MyBlockchainIdService],
})
export class MyBlockchainIdModule {}
