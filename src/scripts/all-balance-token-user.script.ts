import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import * as mongoose from 'mongoose';
import { Model } from 'mongoose';
import { WalletTransaction } from '../wallet/schemas/wallet.transaction.schema.';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  console.log('🌐 SCRIPT STARTED ');

  const mongoUri = process.env.MONGODB_URI;

  try {
    await mongoose.connect(mongoUri);
    console.log('🌐 MongoDB connection established successfully');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    throw error;
  }

  const appContext = await NestFactory.createApplicationContext(AppModule);

  try {
    const transactionModel = appContext.get<Model<WalletTransaction>>(
      WalletTransaction.name + 'Model',
    );

    const aggregationPipeline = [
      {
        $match: {
          deletedAt: null,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'UserDetails',
        },
      },
      {
        $unwind: '$UserDetails',
      },
      {
        $lookup: {
          from: 'wallets',
          localField: 'wallet',
          foreignField: '_id',
          as: 'walletDetails',
        },
      },
      {
        $unwind: '$walletDetails',
      },
      {
        $lookup: {
          from: 'tokens',
          localField: 'walletDetails.token',
          foreignField: '_id',
          as: 'tokenDetails',
        },
      },
      {
        $unwind: '$tokenDetails',
      },
      {
        $group: {
          _id: {
            user: '$user',
            userName: '$UserDetails.username',
            blockchainId: '$UserDetails.blockchainId',
            email: '$UserDetails.email',

            tokenName: '$tokenDetails.name',
          },
          balance: {
            $sum: {
              $cond: [
                { $eq: ['$transactionFlow', 'in'] },
                '$amount',
                { $multiply: ['$amount', -1] },
              ],
            },
          },
        },
      },
      {
        $group: {
          _id: {
            user: '$_id.user',
            userName: '$_id.userName',
            blockchainId: '$_id.blockchainId',
            email: '$_id.email',
          },
          balances: {
            $push: {
              tokenName: '$_id.tokenName',
              balance: { $round: ['$balance', 10] },
            },
          },
        },
      },
      {
        $addFields: {
          balances: {
            $concatArrays: [
              '$balances',
              [
                { tokenName: 'USDK', balance: 0 },
                {
                  tokenName: 'USDK Promo',
                  balance: 0,
                },
                { tokenName: 'USDT', balance: 0 },
                { tokenName: 'BTC', balance: 0 },
              ],
            ],
          },
        },
      },
      {
        $project: {
          _id: 0,
          user: '$_id.user',
          userName: '$_id.userName',
          userBID: '$_id.blockchainId',
          userEmail: '$_id.email',
          balances: {
            $arrayToObject: {
              $map: {
                input: {
                  $reduce: {
                    input: '$balances',
                    initialValue: [],
                    in: {
                      $cond: {
                        if: {
                          $in: ['$$this.tokenName', '$$value.tokenName'],
                        },
                        then: '$$value',
                        else: {
                          $concatArrays: ['$$value', ['$$this']],
                        },
                      },
                    },
                  },
                },
                as: 'balance',
                in: {
                  k: '$$balance.tokenName',
                  v: '$$balance.balance',
                },
              },
            },
          },
        },
      },
    ];

    // Start timing
    console.time('🕒 Total Aggregation Time');

    // Execute aggregation
    const results = await transactionModel.aggregate(aggregationPipeline);

    // Generate timestamp for unique filename
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `user_token_balances_${timestamp}.json`;
    const filepath = path.join(process.cwd(), filename);

    // Write results to file
    fs.writeFileSync(filepath, JSON.stringify(results, null, 2));

    // Log results
    console.timeEnd('🕒 Total Aggregation Time');
    console.log(`📊 Total Records: ${results.length}`);
    console.log(`💾 Results saved to: ${filepath}`);

    // Optional: Print first few results to console
    console.log('🔍 First 3 Results:');
    // console.log(JSON.stringify(results.slice(0, 3), null, 2));
  } catch (error) {
    console.error('Error processing wallets:', error);
  } finally {
    await appContext.close();
    process.exit(0);
  }
}

bootstrap().catch((err) => {
  console.error('Fatal error during processing:', err);
  process.exit(1);
});
