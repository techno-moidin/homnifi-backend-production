import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { WithdrawTransaction } from '../wallet/schemas/withdraw.transaction.schema';
import { WalletTransaction } from '../wallet/schemas/wallet.transaction.schema.';
import { DepositTransaction } from '../wallet/schemas/deposit.transaction.schema';
import { DepositTransactionHistory } from '../wallet/schemas/deposit.history.transaction.schema';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const depositTransactionHistory = appContext.get<
    Model<DepositTransactionHistory>
  >(DepositTransactionHistory.name + 'Model');
  const wallettransactions = appContext.get<Model<WalletTransaction>>(
    WalletTransaction.name + 'Model',
  );
  const transactionHistory = await depositTransactionHistory
    .find({
      fromToken: null,
      settingsUsed: { $ne: null },
      deletedAt: null,
    })
    .populate('settingsUsed')
    .exec();
  if (transactionHistory.length < 0) {
    process.exit(0);
  }

  const BATCH_SIZE = 10000;

  const processTransaction = async (transaction: any) => {
    if (!transaction.settingsUsed) {
      return;
    }
    transaction.fromToken = transaction.settingsUsed.fromToken;
    await transaction.save();
  };

  const processBatch = async (batch: any[]) =>
    Promise.all(batch.map((transaction) => processTransaction(transaction)));

  for (let i = 0; i < transactionHistory.length; i += BATCH_SIZE) {
    const batch = transactionHistory.slice(i, i + BATCH_SIZE);
    await processBatch(batch);
  }
  console.log('Processing complete.');
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
