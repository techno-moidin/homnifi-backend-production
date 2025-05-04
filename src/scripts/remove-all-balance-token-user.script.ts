import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import * as mongoose from 'mongoose';
import { Model, Types } from 'mongoose';
import { WalletTransaction } from '../wallet/schemas/wallet.transaction.schema.';
import * as fs from 'fs';
import * as path from 'path';
import { Wallet } from '../wallet/schemas/wallet.schema';
import { Token } from '../token/schemas/token.schema';
import { DepositTransaction } from '../wallet/schemas/deposit.transaction.schema';
import { DepositTransactionHistory } from '../wallet/schemas/deposit.history.transaction.schema';
import { TrxType } from '../global/enums/trx.type.enum';
import { WalletService } from '../wallet/wallet.service';
import { TransactionStatus } from '../global/enums/transaction.status.enum';

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
    // Get all required models
    const transactionModel = appContext.get<Model<WalletTransaction>>(
      WalletTransaction.name + 'Model',
    );
    const walletService = appContext.get(WalletService);

    const walletModel = appContext.get<Model<Wallet>>(Wallet.name + 'Model');
    const tokenModel = appContext.get<Model<Token>>(Token.name + 'Model');
    const depositTransactionModel = appContext.get<Model<DepositTransaction>>(
      DepositTransaction.name + 'Model',
    );
    const depositTransactionHistoryModel = appContext.get<
      Model<DepositTransactionHistory>
    >(DepositTransactionHistory.name + 'Model');

    const aggregationPipeline = [
      {
        $match: {
          user: {
            $in: [
              new Types.ObjectId('674719456b5c50b620bdb0f7'),
              new Types.ObjectId('66b473b8cce48fcb29c1ed5c'),
              new Types.ObjectId('66b721417c4a34ad56088eb7'),
            ],
          },
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
            email: '$UserDetails.email',
            blockchainId: '$UserDetails.blockchainId',
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
            email: '$_id.email',
            blockchainId: '$_id.blockchainId',
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
        $project: {
          _id: 0,
          user: '$_id.user',
          userName: '$_id.userName',
          userBID: '$_id.blockchainId',
          userEmail: '$_id.email',
          balances: {
            $arrayToObject: {
              $map: {
                input: '$balances',
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

    console.time('🕒 Total Aggregation Time');
    const results: any = await transactionModel.aggregate(aggregationPipeline);

    if (results.length > 0) {
      for (const userResult of results) {
        console.log(`\n👤 Processing user: ${userResult.userName}`);

        try {
          for (const [tokenName, balance] of Object.entries(
            userResult.balances,
          )) {
            console.log(
              `\n🪙 Processing token: ${tokenName} with balance: ${balance}`,
            );
            if (Number(balance) > 0) {
              try {
                // Find token
                const tokenInfo = await tokenModel.findOne({ name: tokenName });
                if (!tokenInfo) {
                  console.error(`❌ Token not found: ${tokenName}`);
                  continue;
                }

                // Find user's wallet for this token
                const userWallet = await walletModel.findOne({
                  user: new Types.ObjectId(userResult.user),
                  token: tokenInfo._id,
                  deletedAt: null,
                });

                if (!userWallet) {
                  console.error(
                    `❌ No wallet found for token ${tokenName} for user ${userResult.userName}`,
                  );
                  continue;
                }

                // Create wallet transaction
                const walletTransaction = await transactionModel.create({
                  user: new Types.ObjectId(userResult.user),
                  wallet: userWallet._id,
                  amount: balance,
                  transactionFlow: 'out',
                  trxType: 'migrate',
                  note: 'As per the management request, All the balance are Removed',
                  createdAt: new Date(),
                  updatedAt: new Date(),
                });
                const { requestId, serialNumber } =
                  await walletService.generateUniqueRequestId(TrxType.DEPOSIT);
                // Create deposit transaction
                const deposit = await depositTransactionModel.create({
                  user: new Types.ObjectId(userResult.user),
                  requestId: requestId,
                  serialNumber: serialNumber,
                  wallet: userWallet._id,
                  amount: -balance,
                  toWallet: userWallet._id,
                  toWalletTrx: walletTransaction._id,
                  transactionStatus: TransactionStatus.SUCCESS,
                  hash: `MIGRATION-management-request`,
                  blockchainId: userResult.userBID,
                  token: tokenInfo._id,
                  previousBalance: balance,
                  newBalance: 0,
                  remarks:
                    'As per the management request, All the balance are Removed',
                });

                // Create deposit history
                await depositTransactionHistoryModel.create({
                  user: new Types.ObjectId(userResult.user),
                  deposit_id: deposit._id,
                  requestId: requestId,
                  fromToken: tokenInfo._id,
                  serialNumber: serialNumber,
                  toWallet: userWallet._id,
                  toWalletTrx: walletTransaction._id,
                  amount: -balance,
                  type: TrxType.DEPOSIT,
                  transactionStatus: TransactionStatus.SUCCESS,

                  hash: `MIGRATION-management-request`,
                  blockchainId: userResult.userBID,
                  token: tokenInfo._id,
                  remarks:
                    'As per the management request, All the balance are Removed',
                  previousBalance: balance,
                  newBalance: 0,
                });

                console.log(
                  `✅ Successfully processed ${tokenName}: ${balance}`,
                );
              } catch (error) {
                console.error(`❌ Error processing token ${tokenName}:`, error);
              }
            }
          }
        } catch (error) {
          console.error(
            `❌ Error processing user ${userResult.userName}:`,
            error,
          );
        }
      }
    }

    // Save results to file
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `user_token_balances_${timestamp}.json`;
    const filepath = path.join(process.cwd(), filename);
    fs.writeFileSync(filepath, JSON.stringify(results, null, 2));

    console.timeEnd('🕒 Total Aggregation Time');
    console.log(`📊 Total Records: ${results.length}`);
    console.log(`💾 Results saved to: ${filepath}`);
  } catch (error) {
    console.error('❌ Error processing wallets:', error);
  } finally {
    await appContext.close();
    process.exit(0);
  }
}

bootstrap().catch((err) => {
  console.error('❌ Fatal error during processing:', err);
  process.exit(1);
});
