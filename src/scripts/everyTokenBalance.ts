import { NestFactory } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { AppModule } from '../app.module';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Wallet, WalletSchema } from '../wallet/schemas/wallet.schema';
import { WalletTransaction } from '../wallet/schemas/wallet.transaction.schema.';
import { Token } from '../token/schemas/token.schema'; // Assuming you have a Token schema for tokens
import * as fs from 'fs';
import { User } from '../users/schemas/user.schema';
import { Mongoose } from 'mongoose'; // Import Mongoose for connection

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);

  // Explicitly ensure MongoDB connection
  // const mongoose = appContext.get<Mongoose>(Mongoose); // Getting mongoose instance
  // if (mongoose.connection.readyState !== 1) {
  //   console.log('Connecting to MongoDB...');
  //   await mongoose.connect(
  //     'mongodb://35.184.63.59:27017/a3-test-homnifi-2?directConnection=true',
  //   ); // Provide your MongoDB URI here
  // }

  const transactionModel = appContext.get<Model<WalletTransaction>>(
    WalletTransaction.name + 'Model',
  );
  const walletModel = appContext.get<Model<Wallet>>(Wallet.name + 'Model');
  const tokenModel = appContext.get<Model<Token>>(Token.name + 'Model');
  const userModel = appContext.get<Model<User>>(User.name + 'Model'); // Fetching User model

  const tokenIds = [
    new Types.ObjectId('66a377f974990141d5c6b9d8'), // First token
    new Types.ObjectId('66a377f974990141d5c6b9de'), // Second token
  ];

  const wallets = await walletModel
    .find({ token: { $in: tokenIds }, deletedAt: null })
    .exec();

  const processWallet = async (wallet: any) => {
    const { totalIn, totalOut, remainingBalance } = await calculateTotalBalance(
      wallet._id,
    );

    // Fetching user details
    const user = await userModel
      .findById(wallet.user)
      .select('email blockchainId username')
      .exec();
    // Fetching token symbol
    const token = await tokenModel
      .findById(wallet.token)
      .select('symbol')
      .exec();

    // Create the result object to store token balances
    const result: any = {};

    // Process balances for each token
    if (token?.symbol) {
      result[token.symbol.toUpperCase()] = remainingBalance;
    }

    return {
      useremail: user?.email,
      userblockchain: user?.blockchainId,
      username: user?.username,
      userwallet: result, // Key-value pair with token symbol as key
    };
  };

  const calculateTotalBalance = async (walletId: string) => {
    const result = await transactionModel.aggregate([
      { $match: { wallet: new Types.ObjectId(walletId), deletedAt: null } },
      {
        $group: {
          _id: null,
          totalIn: {
            $sum: {
              $cond: [{ $eq: ['$transactionFlow', 'in'] }, '$amount', 0],
            },
          },
          totalOut: {
            $sum: {
              $cond: [{ $eq: ['$transactionFlow', 'out'] }, '$amount', 0],
            },
          },
        },
      },
    ]);

    const totalIn = result.length > 0 ? result[0].totalIn : 0;
    const totalOut = result.length > 0 ? result[0].totalOut : 0;
    const remainingBalance = totalIn - totalOut;

    return { totalIn, totalOut, remainingBalance };
  };

  const processedWallets = await Promise.all(wallets.map(processWallet));

  // For each user, make sure you have balances for both tokens
  const result = processedWallets.map((user) => {
    const userwallet = user.userwallet;
    // Checking if the user has wallets for both tokens
    const tokenBalances = {};

    // Add the token balances dynamically for both tokens
    tokenIds.forEach(async (tokenId) => {
      const token = await tokenModel.findById(tokenId).select('symbol').exec();
      if (userwallet[token?.symbol?.toUpperCase()]) {
        tokenBalances[token?.symbol?.toUpperCase()] =
          userwallet[token?.symbol?.toUpperCase()];
      }
    });

    return {
      ...user,
      userwallet: tokenBalances,
    };
  });

  // Write JSON to a file
  fs.writeFileSync('processed_wallets.json', JSON.stringify(result, null, 2));

  console.log(result);

  await appContext.close();
}

bootstrap();
