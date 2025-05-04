import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WallekStake, WallekStakeSchema } from './schemas/wallek-stake.schema';
import {
  WalletTransaction,
  WalletTransactionSchema,
} from '../wallet/schemas/wallet.transaction.schema.';
import { WallekStakeController } from './wallek-stake.controller';
import { WallekStakeService } from './wallek-stake.service';
import {
  DepositTransaction,
  DepositTransactionSchema,
} from '../wallet/schemas/deposit.transaction.schema';
import {
  DepositTransactionHistory,
  DepositTransactionHistorySchema,
} from '../wallet/schemas/deposit.history.transaction.schema';
import {
  WallekTransactionHistory,
  WallekTransactionHistorySchema,
} from './schemas/wallek-transaction-history.schema';
import { WalletModule } from '../wallet/wallet.module';
import { StakeSettings, StakeSettingsSchema } from './schemas/stake-settings.schema';
import { Token, TokenSchema } from '../token/schemas/token.schema';

@Module({
  imports: [
    WalletModule,
    MongooseModule.forFeature([
      { name: WallekStake.name, schema: WallekStakeSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
      { name: DepositTransaction.name, schema: DepositTransactionSchema },
      { name: StakeSettings.name, schema: StakeSettingsSchema },
      { name: Token.name, schema: TokenSchema },
      
      {
        name: DepositTransactionHistory.name,
        schema: DepositTransactionHistorySchema,
      },
      {
        name: WallekTransactionHistory.name,
        schema: WallekTransactionHistorySchema,
      },
    ]),
  ],
  controllers: [WallekStakeController],
  providers: [WallekStakeService],
  exports: [MongooseModule],
})
export class WallekStakeModule {}
