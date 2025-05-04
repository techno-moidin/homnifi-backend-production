import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import mongoose, { Model } from 'mongoose';
import { Token } from '../token/schemas/token.schema';
import { Wallet } from '../wallet/schemas/wallet.schema';
import { WalletTransaction } from '../wallet/schemas/wallet.transaction.schema.';
import { WithdrawTransaction } from '../wallet/schemas/withdraw.transaction.schema';
import { TrxType } from '../global/enums/trx.type.enum';
import { TransactionFlow } from '../wallet/enums/transcation.flow.enum';
import { RequestStatus } from '../wallet/enums/request.status.enum';

async function bootstrap() {
  console.log('Starting transaction processing script...');
  const appContext = await NestFactory.createApplicationContext(AppModule);

  try {
    // Get model instances
    const WithdrawTransactionModel = appContext.get<Model<WithdrawTransaction>>(
      WithdrawTransaction.name + 'Model',
    );
    const walletTransactionModel = appContext.get<Model<WalletTransaction>>(
      WalletTransaction.name + 'Model',
    );

    console.log('Fetching withdraw transactions...');
    const findAllWithdrawTransactions = await WithdrawTransactionModel.find({
      metaKey: 'xtp',
    });

    console.log(
      `Found ${findAllWithdrawTransactions.length} transactions to process`,
    );

    if (findAllWithdrawTransactions.length > 0) {
      for (const element of findAllWithdrawTransactions) {
        const amount = element.amount;
        const total = element.total;
        element.metaAmount = amount;
        element.metaTotal = total;
        element.amount = total;
        element.total = amount;
        await element.save();
      }
    }

    console.log('Transaction processing completed successfully');
  } catch (error) {
    console.error('An error occurred during transaction analysis:', error);
    throw error; // Re-throw to be caught by the bootstrap catch block
  } finally {
    console.log('Closing application context...');
    await appContext.close();
    process.exit(0);
  }
}

bootstrap()
  .then(() => {
    console.log('Script execution completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Unhandled error during script execution:', err);
    process.exit(1);
  });
