import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { WithdrawTransaction } from '../wallet/schemas/withdraw.transaction.schema';
import { WalletTransaction } from '../wallet/schemas/wallet.transaction.schema.';
import { DepositTransaction } from '../wallet/schemas/deposit.transaction.schema';
import { User } from '../users/schemas/user.schema';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const withdrawTransaction = appContext.get<Model<WithdrawTransaction>>(
    WithdrawTransaction.name + 'Model',
  );

  const UserModel = appContext.get<Model<User>>(User.name + 'Model');
  const wallettransactions = appContext.get<Model<WalletTransaction>>(
    WalletTransaction.name + 'Model',
  );

  const userData = await UserModel.findOne({
    blockchainId: '5612215303',
  });
  if (!userData) {
    process.exit(0);
  }
  const transaction = await withdrawTransaction
    .find({
      user: userData._id,
      deletedAt: null,
    })
    .populate({
      path: 'fromWalletTrx',
      select: 'amount wallet transactionFlow createdAt',
    })
    .exec();
  if (transaction.length < 0) {
    process.exit(0);
  }

  const BATCH_SIZE = 10000;

  const processTransaction = async (transaction: any) => {
    if (!transaction.fromWalletTrx) {
      return;
    }

    const pipeline = [
      {
        $match: {
          wallet: transaction.fromWallet,
          createdAt: {
            $lt: transaction.fromWalletTrx.createdAt,
          },
          deletedAt: null,
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
          wallet: transaction.fromWallet,
          createdAt: {
            $lte: transaction.fromWalletTrx.createdAt,
          },
          deletedAt: null,
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

    const newBalance = newBalanceResult[0]?.newBalance || 0;
    const oldBalance = oldBalanceResult[0]?.oldBalance || 0;

    transaction.newBalance = newBalance;
    transaction.previousBalance = oldBalance;
    console.log('Updating transaction:', transaction._id);
    await transaction.save();
  };

  const processBatch = async (batch: any[]) =>
    Promise.all(batch.map((transaction) => processTransaction(transaction)));

  for (let i = 0; i < transaction.length; i += BATCH_SIZE) {
    const batch = transaction.slice(i, i + BATCH_SIZE);
    await processBatch(batch);
  }
  console.log('Processing complete.');
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
