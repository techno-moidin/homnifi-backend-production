import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model, Types } from 'mongoose';
import { CloudKReward } from '../cloud-k/schemas/cloudk-reward.schema';
import { WalletTransaction } from '../wallet/schemas/wallet.transaction.schema.';
import * as fs from 'fs'; // Import the fs module
import * as path from 'path';
import { TransactionFlow } from '../wallet/enums/transcation.flow.enum';
import { TrxType } from '../global/enums/trx.type.enum';
import { User } from '../users/schemas/user.schema';
import {
  CloudKTransactions,
  CloudKTransactionTypes,
} from '../cloud-k/schemas/cloudk-transactions.schema';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);

  const walletTransaction = appContext.get<Model<WalletTransaction>>(
    WalletTransaction.name + 'Model',
  );
  const cloudKTransactions = appContext.get<Model<CloudKTransactions>>(
    CloudKTransactions.name + 'Model',
  );

  const jsonData = await fs.promises.readFile(
    path.join(__dirname, '../../conflict_data_main_.json'),
    'utf-8',
  );
  const list = JSON.parse(jsonData);
  // ;

  // const list = [
  //   {
  //     _id: '66caf3812e72daa4b5e61daa',
  //     user: '66e3bb1fbc887c25d04fef57',
  //     wallet: '66c5e5c545801ee4eceedbbd',
  //     claimed: 0.22238342,
  //     extra: 0.00512935,
  //     lyk_w_balance: 0,
  //     createdAt: '2024-08-25T09:04:01.130Z',
  //     bid: 'testing',
  //   },
  // ];

  // {
  //   "user": "66ae21120bba7f300e1e1f99",
  //   "claimed": 0.5,
  //   "extra": 0.2,
  //   "bid": "7089512121",
  //   "claimedList":[
  //     {
  //       "_id": "66cc2eab43b8086c0cea1df5",
  //       "claimed": 0.3,
  //       "extra": 0.1,
  //       "createdAt": "2024-08-26T07:28:43.188Z",
  //     },
  //     {
  //       "_id": "66caf3812e72daa4b5e61daa",
  //       "claimed": 0.2,
  //       "extra": 0.1,
  //       "createdAt": "2024-08-25T09:04:01.130Z"
  //     }
  //   ]
  // },

  const mergedData = Object.values(
    list.reduce((acc, item) => {
      const { user, claimed, extra, _id, createdAt, bid } = item;

      if (!acc[user]) {
        acc[user] = {
          user,
          claimed: 0,
          extra: 0,
          bid,
          claimedList: [],
        };
      }

      acc[user].claimed += claimed;
      acc[user].extra += extra;
      acc[user].claimedList.push({
        _id,
        claimed,
        extra,
        createdAt,
      });

      return acc;
    }, {}),
  );

  // ;

  // fs.writeFileSync(
  //   'conflict_data_main_merge.json',
  //   JSON.stringify(mergedData, null, 2),
  //   'utf8',
  // );
  // ;

  // return;

  const results = [];

  const cloudkTransactionData = [];

  for (let index = 0; index < mergedData.length; index++) {
    const element: any = mergedData[index];

    cloudkTransactionData.push({
      tokenAmount: 0 - element.extra,
      type: CloudKTransactionTypes.REWARDS_CLAIMED,
      user: new Types.ObjectId(element.user),
      token: new Types.ObjectId('66a377f974990141d5c6b9de'),
      note: 'Claimed Adjust',
      meta: {
        note: 'We adjusted this for extra claims. user claimed extra because deletedAt not implemented on reward claimed function',
        ...element,
        method: 'scripting',
        type: 'extra_claim',
        status: 'pending',
      },
    });
  }
  await cloudKTransactions.insertMany(cloudkTransactionData);

  ;
  console.info('Good Job, All done!');
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
