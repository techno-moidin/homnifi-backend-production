import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { User } from '../users/schemas/user.schema';
import { Model, Types } from 'mongoose';
import { SupernodeService } from '../supernode/supernode.service';
import {
  CLOUDK_MACHINE_STATUS,
  CloudKMachine,
} from '../cloud-k/schemas/cloudk-machine.schema';
import { DepositSetting } from '../token/schemas/deposit.settings.schema';
import { DepositTransaction } from '../wallet/schemas/deposit.transaction.schema';
import { DepositTransactionHistory } from '../wallet/schemas/deposit.history.transaction.schema';
import { Token } from '../token/schemas/token.schema';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const depositSettingModel = appContext.get<Model<DepositSetting>>(
    DepositSetting.name + 'Model',
  );
  const depositTransactionModel = appContext.get<Model<DepositTransaction>>(
    DepositTransaction.name + 'Model',
  );
  const depositTransactionHistoryModel = appContext.get<
    Model<DepositTransactionHistory>
  >(DepositTransactionHistory.name + 'Model');

  const TokenModel = appContext.get<Model<Token>>(Token.name + 'Model');

  try {
    const depositSettings = await depositSettingModel.find({
      isOnChainDeposit: true,
    });

    const usdtToken = await TokenModel.findOne({
      symbol: 'usdt',
      deletedAt: null,
    });

    const depositSettingIds = depositSettings.map((setting) => setting._id);
    await depositTransactionModel.updateMany(
      { fromToken: usdtToken._id },
      { $set: { isOnChainDeposit: true } },
    );

    await depositTransactionHistoryModel.updateMany(
      { fromToken: usdtToken._id },
      { $set: { isOnChainDeposit: true } },
    );
    await Promise.all([
      depositTransactionModel.updateMany(
        { settingsUsed: { $in: depositSettingIds } },
        { $set: { isOnChainDeposit: true } },
      ),
      depositTransactionHistoryModel.updateMany(
        { settingsUsed: { $in: depositSettingIds } },
        { $set: { isOnChainDeposit: true } },
      ),
    ]);

    console.log('Deposit transactions updated successfully.');
  } catch (error) {
    console.error('Error updating users:', error);
  } finally {
    await appContext.close();
    process.exit(0);
  }
}

bootstrap().catch((err) => {
  console.error('Error during bootstrap:', err);
  process.exit(1);
});
