import { forwardRef, Module } from '@nestjs/common';
import { UsdkStakeController } from './usdk-stake.controller';
import { UsdkStakeService } from './usdk-stake.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  UsdkStakeSettings,
  UsdkStakeSettingsSchema,
} from './schemas/usdkStakeSettings.schema';
import {
  UsdkStakeTransactions,
  UsdkStakeTransactionsSchema,
} from './schemas/usdkStakeTransaction.schema';
import {
  CloudKMachine,
  CloudKMachineSchema,
} from '../cloud-k/schemas/cloudk-machine.schema';
import { Token, TokenSchema } from '../token/schemas/token.schema';
import { Wallet } from 'ethers';
import { WalletSchema } from '../wallet/schemas/wallet.schema';
import {
  WalletTransaction,
  WalletTransactionSchema,
} from '../wallet/schemas/wallet.transaction.schema.';
import {
  CloudKMachineStake,
  CloudKMachineStakeSchema,
} from '../cloud-k/schemas/cloudk-machine-stakes.schema';
import { UsdkStakeRewardService } from './usdk-stake-reward.service';
import {
  UsdkStakeReward,
  UsdkStakeRewardSchema,
} from './schemas/usdkStakeReward.schema';
import { CloudKService } from '../cloud-k/cloud-k.service';
import {
  CloudKTransactions,
  CloudKTransactionsSchema,
} from '../cloud-k/schemas/cloudk-transactions.schema';
import {
  CloudKReward,
  CloudKRewardSchema,
} from '../cloud-k/schemas/cloudk-reward.schema';
import {
  UsdkStakeTransactionHistory,
  UsdkStakeTransactionHistorySchema,
} from './schemas/usdkStakeTransactionHistory';
import {
  CloudKSimulationMachine,
  CloudKSimulationMachineSchema,
} from '../cloud-k/schemas/cloudk-simulation-machine.schema';
import {
  CloudKAutoCompoundPenalty,
  CloudKAutoCompoundPenaltySchema,
} from '../cloud-k/schemas/ac-penalty.schema';
import { HttpService } from '@nestjs/axios';
import { WalletService } from '../wallet/wallet.service';
import { CloudKModule } from '../cloud-k/cloud-k.module';
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
import { TokenModule } from '../token/token.module';
import { WalletModule } from '../wallet/wallet.module';
import {
  SwapTransactionHistory,
  SwapTransactionHistorySchema,
} from '../wallet/schemas/swap.transaction.history.schema';
import {
  SwapTransaction,
  SwapTransactionSchema,
} from '../wallet/schemas/swap.transaction.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import {
  UsdkStakeGlobalAutoCompound,
  UsdkStakeGlobalAutoCompoundSchema,
} from './schemas/usdkstake-global-auto-compund.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UsdkStakeSettings.name, schema: UsdkStakeSettingsSchema },
      { name: UsdkStakeTransactions.name, schema: UsdkStakeTransactionsSchema },
      { name: CloudKMachine.name, schema: CloudKMachineSchema },
      { name: Token.name, schema: TokenSchema },
      { name: Wallet.name, schema: WalletSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
      { name: CloudKMachineStake.name, schema: CloudKMachineStakeSchema },
      { name: UsdkStakeReward.name, schema: UsdkStakeRewardSchema },
      { name: CloudKTransactions.name, schema: CloudKTransactionsSchema },
      { name: CloudKReward.name, schema: CloudKRewardSchema },
      {
        name: CloudKAutoCompoundPenalty.name,
        schema: CloudKAutoCompoundPenaltySchema,
      },
      {
        name: CloudKSimulationMachine.name,
        schema: CloudKSimulationMachineSchema,
      },
      { name: CloudKInflation.name, schema: CloudKInflationSchema },
      { name: CloudKInflationRules.name, schema: CloudKInflationRulesSchema },
      {
        name: CloudKGlobalAutoCompound.name,
        schema: CloudKGlobalAutoCompoundSchema,
      },
      {
        name: UsdkStakeTransactionHistory.name,
        schema: UsdkStakeTransactionHistorySchema,
      },
      {
        name: CloudKSetting.name,
        schema: CloudKSettingSchema,
      },
      {
        name: SwapTransactionHistory.name,
        schema: SwapTransactionHistorySchema,
      },
      { name: SwapTransaction.name, schema: SwapTransactionSchema },
      { name: User.name, schema: UserSchema },
      {
        name: UsdkStakeGlobalAutoCompound.name,
        schema: UsdkStakeGlobalAutoCompoundSchema,
      },
    ]),
    forwardRef(() => TokenModule),
    forwardRef(() => CloudKModule),
    forwardRef(() => WalletModule),
  ],
  controllers: [UsdkStakeController],
  providers: [UsdkStakeService, UsdkStakeRewardService],
  exports: [UsdkStakeService, UsdkStakeRewardService],
})
export class UsdkStakeModule {}
