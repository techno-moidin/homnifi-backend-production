import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { WithdrawTransaction } from '../wallet/schemas/withdraw.transaction.schema';
import { WalletTransaction } from '../wallet/schemas/wallet.transaction.schema.';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const withdrawTransaction = appContext.get<Model<WithdrawTransaction>>(
    WithdrawTransaction.name + 'Model',
  );
  const wallettransactions = appContext.get<Model<WalletTransaction>>(
    WalletTransaction.name + 'Model',
  );
  const transaction = await withdrawTransaction
    .find({})
    .populate({
      path: 'fromWalletTrx',
      select: 'amount wallet transactionFlow createdAt',
    })
    .exec();
  if (transaction.length < 0) {
    ;
    process.exit(0);
  }
  for (let index = 0; index < transaction.length; index++) {
    const element: any = transaction[index];
    const pipeline = [
      {
        $match: {
          wallet: element.fromWallet,
          createdAt: {
            $lt: element.fromWalletTrx.createdAt,
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
          new: 1,
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
          new: 1,
        },
      },
    ];

    const [newBalanceResult, oldBalanceResult] = await Promise.all([
      wallettransactions.aggregate(pipeline2),
      wallettransactions.aggregate(pipeline),
    ]);

    // Since the result is an array, access the first element
    const newBalance = newBalanceResult[0]?.newBalance || 0;
    const oldBalance = oldBalanceResult[0]?.oldBalance || 0;

    element.newBalance = newBalance;
    element.previousBalance = oldBalance;

    // Save the element after updating
    await element.save();
  }

  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
