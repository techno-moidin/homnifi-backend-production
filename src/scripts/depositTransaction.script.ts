import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { WithdrawTransaction } from '../wallet/schemas/withdraw.transaction.schema';
import { WalletTransaction } from '../wallet/schemas/wallet.transaction.schema.';
import { DepositTransaction } from '../wallet/schemas/deposit.transaction.schema';
import { User } from '../users/schemas/user.schema';

async function bootstrap() {
  const args = process.argv.slice(2);
  const blockchainId = args[0]; // Get the first argument passed to the script

  if (!blockchainId) {
    console.error('Error: Please provide a blockchainId as an argument.');
    process.exit(1);
  }

  const appContext = await NestFactory.createApplicationContext(AppModule);
  const deposittransactions = appContext.get<Model<DepositTransaction>>(
    DepositTransaction.name + 'Model',
  );

  const UserModel = appContext.get<Model<User>>(User.name + 'Model');
  const wallettransactions = appContext.get<Model<WalletTransaction>>(
    WalletTransaction.name + 'Model',
  );

  const userData = await UserModel.findOne({
    blockchainId,
  });
  if (!userData) {
    process.exit(0);
  }
  const transaction = await deposittransactions
    .find({
      user: userData._id,
      deletedAt: null,
    })
    .populate({
      path: 'toWalletTrx',
      select: 'amount wallet transactionFlow createdAt',
    })
    .exec();

  if (transaction.length < 0) {
    process.exit(0);
  }

  const BATCH_SIZE = 10000;

  const processTransaction = async (transaction: any) => {
    if (!transaction.toWalletTrx) {
      return;
    }

    const pipeline = [
      {
        $match: {
          wallet: transaction.toWallet,
          createdAt: {
            $lt: transaction.toWalletTrx.createdAt,
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
          wallet: transaction.toWallet,
          createdAt: {
            $lte: transaction.toWalletTrx.createdAt,
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
