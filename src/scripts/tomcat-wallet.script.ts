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
import { padToTenDigits } from '../utils/common/common.functions';

type PromotionRow = { user_id: string; Tomocat_Promotion: number };

const CHUNK_SIZE = 500; // Define the chunk size

async function processRow(
  promotionRow: PromotionRow,
  tokenService: TokenService,
  userService: UsersService,
  walletService: WalletService,
  depositTransaction: Model<DepositTransaction>,
  depositTransactionHistory: Model<DepositTransactionHistory>,
): Promise<void> {
  const { user_id, Tomocat_Promotion } = promotionRow;

  if (isNaN(Tomocat_Promotion)) {
    console.error(`Invalid tomocatPromotion amount for user ${user_id}`);
    return;
  }

  //! Token
  const _token = await tokenService.findTokenBysymbol('tomo');
  if (!_token) {
    console.error(`Token not found: tomcat`);
    return;
  }

  //! User
  if (!user_id) {
    console.error(`User blockchainId Not found in the sheet.`);
    return;
  }
  const fixedBidFormat = await padToTenDigits(user_id);
  const user = await userService.getOrCreateUserByBIDForScript(fixedBidFormat);
  if (!user) {
    console.error(`User not found: ${user_id}`);
    return;
  }

  const note = `Migration deposit - All-in-One Promotion Balance ${Tomocat_Promotion}`;

  //! Wallet
  const toWallet = await walletService.findUserWalletByTokenSymbol(
    _token.symbol,
    user._id as Types.ObjectId,
  );

  const type = TrxType.DEPOSIT;

  const { walletBalance } = await walletService.getBalanceByWallet(
    user._id as Types.ObjectId,
    toWallet._id,
  );
  if (Tomocat_Promotion > 0) {
    const walletTransaction: CreateWalletTransactionDto = {
      user: user._id as Types.ObjectId,
      wallet: toWallet._id,
      trxType: type,
      amount: Tomocat_Promotion,
      actualAmount: Tomocat_Promotion,
      transactionFlow: TransactionFlow.IN,
      meta: promotionRow,
      note: note,
      remark: `Auto-migrated from csv file`,
    };

    const toWalletTransaction =
      await walletService.createRawWalletTransaction(walletTransaction);
    const trx = toWalletTransaction[0]?.['_id'];

    const { requestId, serialNumber } =
      await walletService.generateUniqueRequestId(type);

    const newDeposit = await depositTransaction.create({
      fromToken: _token._id,
      user: user._id,
      type: type,
      token: _token._id,
      toWallet: toWallet,
      toWalletTrx: trx,
      fromAmount: Tomocat_Promotion,
      amount: Tomocat_Promotion,
      currentRateInUSD: 0,
      convertedRateInUSD: 0,
      serialNumber: serialNumber,
      requestId,
      transactionStatus: TransactionStatus.SUCCESS,
      note: note,
      newBalance: walletBalance + Tomocat_Promotion,
      previousBalance: walletBalance,
      blockchainId: user?.blockchainId || null,
      meta: promotionRow,
      remarks: `${Tomocat_Promotion} Tomo successfully deposited to your wallet from All-in-One Promotion.`,
    });

    const newDepositTransactionHistory = await depositTransactionHistory.create(
      {
        deposit_id: newDeposit._id,
        from: Deposit_Transaction_Type.Deposit,
        type: type,
        fromToken: _token._id,
        token: _token._id,
        user: user._id,
        toWallet: toWallet,
        fromAmount: Tomocat_Promotion,
        toWalletTrx: trx,
        amount: Tomocat_Promotion,
        currentRateInUSD: 0,
        convertedRateInUSD: 0,
        serialNumber: serialNumber,
        requestId,
        transactionStatus: TransactionStatus.SUCCESS,
        note: note,
        newBalance: walletBalance + Tomocat_Promotion,
        previousBalance: walletBalance,
        blockchainId: user?.blockchainId || null,
        meta: promotionRow,
        remarks: `${Tomocat_Promotion} Tomo successfully deposited to your wallet from All-in-One Promotion.`,
      },
    );

    await Promise.all([newDeposit.save(), newDepositTransactionHistory.save()]);
  }

  console.log(`Migration completed for user ${user_id} (Promotion Balance)`);
}

async function processChunk(
  chunk: PromotionRow[],
  tokenService: TokenService,
  userService: UsersService,
  walletService: WalletService,
  depositTransaction: Model<DepositTransaction>,
  depositTransactionHistory: Model<DepositTransactionHistory>,
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

  try {
    const promotionRows: PromotionRow[] = [];

    await new Promise<void>((resolve, reject) => {
      fs.createReadStream('./uploads/csv/tomocat_promotion_users_main_test.csv')
        // fs.createReadStream('./uploads/csv/tomocat_promotion_users_main.csv')
        .pipe(csv())
        .on('data', (row) =>
          promotionRows.push({
            user_id: row.user_id,
            Tomocat_Promotion: parseFloat(
              row.Tomocat_Promotion.replace(/,/g, ''),
            ),
          }),
        )
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`CSV file read successfully with ${promotionRows.length} rows`);

    const chunks = [];
    for (let i = 0; i < promotionRows.length; i += CHUNK_SIZE) {
      chunks.push(promotionRows.slice(i, i + CHUNK_SIZE));
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
