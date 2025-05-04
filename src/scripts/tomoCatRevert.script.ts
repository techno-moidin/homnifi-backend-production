import { NestFactory } from '@nestjs/core';
import * as fs from 'fs';
import { Model, Types } from 'mongoose';
import { AppModule } from '../app.module';
import { TokenService } from '../token/token.service';
import { UsersService } from '../users/users.service';
import { WalletService } from '../wallet/wallet.service';
import csv = require('csv-parser');
import { TransactionStatus } from '../global/enums/transaction.status.enum';
import {
  Deposit_Transaction_Type,
  TrxType,
} from '../global/enums/trx.type.enum';
import { TransactionFlow } from '../wallet/enums/transcation.flow.enum';
import { CreateWalletTransactionDto } from '../wallet/dto/create-transaction.dto';
import { DepositTransaction } from '../wallet/schemas/deposit.transaction.schema';
import { DepositTransactionHistory } from '../wallet/schemas/deposit.history.transaction.schema';
import { WalletTransaction } from '../wallet/schemas/wallet.transaction.schema.';
import { MyBlockchainIdService } from '../my-blockchain-id/my-blockchain-id.service';
import { User } from '../users/schemas/user.schema';

type PromotionRow = { user_id: string; Tomocat_Promotion: number };

const CHUNK_SIZE = 500; // Define the chunk size

async function processRow(
  user: any,
  tokenService: TokenService,
  userService: UsersService,
  walletService: WalletService,
  depositTransaction: Model<DepositTransaction>,
  depositTransactionHistory: Model<DepositTransactionHistory>,
  WalletTransactionModel: Model<WalletTransaction>,
  UserModel: Model<User>,
): Promise<void> {
  //! Token
  const _token = await tokenService.findTokenBysymbol('tomo');
  if (!_token) {
    console.error(`Token not found: tomcat`);
    return;
  }

  //! Wallet
  const toWallet = await walletService.findUserWalletByTokenSymbol(
    _token.symbol,
    user._id as Types.ObjectId,
  );

  const type = TrxType.DEPOSIT;

  await WalletTransactionModel.updateMany(
    {
      wallet: toWallet._id,
      trxType: type,
      user: user._id as Types.ObjectId,
      //   remark: `Auto-migrated from csv file`,
      transactionFlow: TransactionFlow.IN,
      $or: [
        {
          note: {
            $regex:
              '^Migration deposit - Purchased Balance and All-in-One Promotion Balance.*',
            $options: 'i',
          },
        },
        {
          note: {
            $regex: '^Migration deposit - All-in-One Promotion Balance.*',
            $options: 'i',
          },
        },
      ],
      deletedAt: null,
    },
    { $set: { deletedAt: new Date() } },
  );

  await depositTransaction.updateMany(
    {
      fromToken: _token._id,
      user: user._id,
      //   type: type,ß
      token: _token._id,
      toWallet: toWallet,
      transactionStatus: TransactionStatus.SUCCESS,
      $or: [
        {
          note: {
            $regex:
              '^Migration deposit - Purchased Balance and All-in-One Promotion Balance.*',
            $options: 'i',
          },
        },
        {
          note: {
            $regex: '^Migration deposit - All-in-One Promotion Balance.*',
            $options: 'i',
          },
        },
      ],
      deletedAt: null,
    },
    { $set: { deletedAt: new Date() } },
  );

  await depositTransactionHistory.updateMany(
    {
      user: user._id,
      toWallet: toWallet,
      transactionStatus: TransactionStatus.SUCCESS,
      $or: [
        {
          note: {
            $regex:
              '^Migration deposit - Purchased Balance and All-in-One Promotion Balance.*',
            $options: 'i',
          },
        },
        {
          note: {
            $regex: '^Migration deposit - All-in-One Promotion Balance.*',
            $options: 'i',
          },
        },
      ],
      deletedAt: null,
    },
    { $set: { deletedAt: new Date() } },
  );

  //   const data = await UserModel.updateOne(
  //     {
  //       _id: new Types.ObjectId(user._id),
  //     },
  //     { $set: { deletedAt: new Date() } },
  //   );

  console.log(`Migration completed for user ${user._id} (Promotion Balance)`);
}

async function processChunk(
  chunk: [],
  tokenService: TokenService,
  userService: UsersService,
  walletService: WalletService,
  depositTransaction: Model<DepositTransaction>,
  depositTransactionHistory: Model<DepositTransactionHistory>,
  WalletTransactionModel: Model<WalletTransaction>,
  UserModel: Model<User>,
): Promise<void> {
  console.log(`Processing chunk with ${chunk.length} rows`);
  const rowPromises = chunk.map((row) =>
    processRow(
      row,
      tokenService,
      userService,
      walletService,
      depositTransaction,
      depositTransactionHistory,
      WalletTransactionModel,
      UserModel,
    ),
  );

  await Promise.all(rowPromises);
  console.log(`Chunk processed successfully`);
}

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const walletService = appContext.get(WalletService);
  const tokenService = appContext.get(TokenService);
  const myBlockchainIdService = appContext.get(MyBlockchainIdService);
  const userService = appContext.get(UsersService);

  const depositTransaction = appContext.get<Model<DepositTransaction>>(
    DepositTransaction.name + 'Model',
  );
  const depositTransactionHistory = appContext.get<
    Model<DepositTransactionHistory>
  >(DepositTransactionHistory.name + 'Model');

  const WalletTransactionModel = appContext.get<Model<WalletTransaction>>(
    WalletTransaction.name + 'Model',
  );

  const UserModel = appContext.get<Model<User>>(User.name + 'Model');

  try {
    const userDatas = await UserModel.find({
      $expr: { $ne: [{ $strLenCP: '$blockchainId' }, 10] },
      //   createdAt: { $gte: new Date('2025-02-19T00:00:00.000Z') },
      deletedAt: null,
    });
    if (!userDatas) {
      console.log('No user exist in database');
      process.exit(0);
    }

    const chunks = [];
    for (let i = 0; i < userDatas.length; i += CHUNK_SIZE) {
      chunks.push(userDatas.slice(i, i + CHUNK_SIZE));
    }

    console.log(`Processing ${chunks.length} chunks...`);

    for (const chunk of chunks) {
      await processChunk(
        chunk,
        tokenService,
        userService,
        walletService,
        depositTransaction,
        depositTransactionHistory,
        WalletTransactionModel,
        UserModel,
      );
    }
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await appContext.close();
    console.log('Migration script completed.');
    process.exit(0);
  }
}

bootstrap().catch((err) => {
  console.error('Error bootstrapping application:', err);
  process.exit(1);
});
