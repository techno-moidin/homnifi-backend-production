import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/src/app.module';
import { WalletService } from '@/src/wallet/wallet.service';

import { Model } from 'mongoose';
import { DepositTransaction } from '../wallet/schemas/deposit.transaction.schema';
import { DepositTransactionHistory } from '../wallet/schemas/deposit.history.transaction.schema';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);

  const depositTransactionModel = appContext.get<Model<DepositTransaction>>(
    DepositTransaction.name + 'Model',
  );
  const depositTransactionHistoryModel = appContext.get<
    Model<DepositTransactionHistory>
  >(DepositTransactionHistory.name + 'Model');

  try {
    console.log('Fetching all wallets...');
    const depositTrans = await depositTransactionModel.find({
      remarks: new RegExp('from Cloudk wallet successfully deposited v5', 'i'),
    });
    const depositHistoryTrans = await depositTransactionHistoryModel.find({
      remarks: new RegExp('from Cloudk wallet successfully deposited v5.', 'i'),
    });

    // for deposit
    if (depositTrans.length !== 0) {
      for (let index = 0; index < depositTrans.length; index++) {
        const element = depositTrans[index];
        const updatedText = element.remarks.replace(' v5.', '');
        element.remarks = updatedText;
        console.log(updatedText);
        await element.save();
      }
    }

    // for deposit history
    if (depositHistoryTrans.length !== 0) {
      for (let index = 0; index < depositHistoryTrans.length; index++) {
        const element = depositHistoryTrans[index];
        const updatedText = element.remarks.replace(' v5.', '');
        element.remarks = updatedText;
        await element.save();
      }
    }

    console.log('compleated');
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
