import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { WalletTransaction } from '../wallet/schemas/wallet.transaction.schema.';
import { SwapTransaction } from '../wallet/schemas/swap.transaction.schema';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const swaptransactions = appContext.get<Model<SwapTransaction>>(
    SwapTransaction.name + 'Model',
  );
  const wallettransactions = appContext.get<Model<WalletTransaction>>(
    WalletTransaction.name + 'Model',
  );

  const transactions = await swaptransactions
    .find({})
    .populate({
      path: 'fromWalletTrx',
      select: 'amount wallet transactionFlow createdAt',
    })
    .exec();

  if (transactions.length === 0) {
    ;
    process.exit(0);
  }

  for (let index = 0; index < transactions.length; index++) {
    const element: any = transactions[index];

    if (!element.fromWalletTrx || !element.fromWalletTrx.createdAt) {
      console.error(
        'Missing fromWalletTrx or createdAt for transaction:',
        element._id,
      );
      continue; // Skip this transaction if the necessary data is missing
    }

    const pipeline = [
      {
        $match: {
          wallet: element.fromWallet,
          createdAt: {
            $lt: element.fromWalletTrx.createdAt, // Access createdAt safely
          },
        },
      },
      {
        $group: {
          _id: null,
          oldBalance: {
            $sum: {
              $cond: [
                { $eq: ['$transactionFlow', 'in'] },
                '$amount',
                { $multiply: [-1, '$amount'] },
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          oldBalance: 1,
        },
      },
    ];

    const pipeline2 = [
      {
        $match: {
          wallet: element.fromWallet,
          createdAt: {
            $lte: element.fromWalletTrx.createdAt,
          },
        },
      },
      {
        $group: {
          _id: null,
          newBalance: {
            $sum: {
              $cond: [
                { $eq: ['$transactionFlow', 'in'] },
                '$amount',
                { $multiply: [-1, '$amount'] },
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          newBalance: 1,
        },
      },
    ];

    const [newBalanceResult, oldBalanceResult] = await Promise.all([
      wallettransactions.aggregate(pipeline2),
      wallettransactions.aggregate(pipeline),
    ]);

    // Safely access the balance results
    const newBalance = newBalanceResult[0]?.newBalance || 0;
    const oldBalance = oldBalanceResult[0]?.oldBalance || 0;

    // Update the current transaction with new and previous balances
    element.newBalance = newBalance;
    element.previousBalance = oldBalance;

    // Save the transaction after updating balances
    await element.save();
  }

  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
