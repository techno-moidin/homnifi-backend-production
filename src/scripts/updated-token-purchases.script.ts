import { NestFactory } from '@nestjs/core';
import * as fs from 'fs';
import { Model, Types } from 'mongoose';
import { AppModule } from '../app.module';
import { TokenService } from '../token/token.service';
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
import { MyBlockchainIdService } from '../my-blockchain-id/my-blockchain-id.service';
import { WalletTransaction } from '../wallet/schemas/wallet.transaction.schema.';
import { UsersService } from '../users/users.service';

type PurchasesRow = { BID: string; Remaining_Claimable_Tokens: number };

const CHUNK_SIZE = 500; // Define the chunk size

async function processRow(
  purchasesRow: PurchasesRow,
  tokenService: TokenService,
  userService: UsersService,
  walletService: WalletService,
  depositTransaction: Model<DepositTransaction>,
  depositTransactionHistory: Model<DepositTransactionHistory>,
): Promise<void> {
  const { BID, Remaining_Claimable_Tokens } = purchasesRow;

  if (isNaN(Remaining_Claimable_Tokens)) {
    console.error(`Invalid Remaining_Claimable_Tokens amount for BID ${BID}`);
    return;
  }

  //! Token
  const _token = await tokenService.findTokenBysymbol('tomo');
  if (!_token) {
    console.error(`Token not found: tomcat`);
    return;
  }

  //! User
  if (!BID) {
    console.error(`BID not found in the sheet.`);
    return;
  }
  const user = await userService.getOrCreateUserByBID(BID);
  if (!user) {
    console.error(`User not found: ${BID}`);
    return;
  }

  const note = `Migration deposit - Purchased Balance and All-in-One Promotion Balance: ${Remaining_Claimable_Tokens}`;

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

  if (Remaining_Claimable_Tokens > 0) {
    const walletTransaction: CreateWalletTransactionDto = {
      user: user._id as Types.ObjectId,
      wallet: toWallet._id,
      trxType: type,
      amount: Remaining_Claimable_Tokens,
      actualAmount: Remaining_Claimable_Tokens,
      transactionFlow: TransactionFlow.IN,
      meta: purchasesRow,
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
      fromAmount: Remaining_Claimable_Tokens,
      amount: Remaining_Claimable_Tokens,
      currentRateInUSD: 0,
      convertedRateInUSD: 0,
      serialNumber: serialNumber,
      requestId,
      transactionStatus: TransactionStatus.SUCCESS,
      note: note,
      newBalance: walletBalance + Remaining_Claimable_Tokens,
      previousBalance: walletBalance,
      blockchainId: user?.blockchainId || null,
      meta: purchasesRow,
      remarks: `${Remaining_Claimable_Tokens} ${_token.symbol} deposited successfully to the wallet.`,
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
        fromAmount: Remaining_Claimable_Tokens,
        toWalletTrx: trx,
        amount: Remaining_Claimable_Tokens,
        currentRateInUSD: 0,
        convertedRateInUSD: 0,
        serialNumber: serialNumber,
        requestId,
        transactionStatus: TransactionStatus.SUCCESS,
        note: note,
        newBalance: walletBalance + Remaining_Claimable_Tokens,
        previousBalance: walletBalance,
        blockchainId: user?.blockchainId || null,
        meta: purchasesRow,
        remarks: `${Remaining_Claimable_Tokens} ${_token.symbol} deposited successfully to the wallet.`,
      },
    );

    await Promise.all([newDeposit.save(), newDepositTransactionHistory.save()]);
  }
  console.log(`Migration completed for BID ${BID} (Promotion Balance)`);
}

async function processChunk(
  chunk: PurchasesRow[],
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
    const purchasesRows: PurchasesRow[] = [];

    await new Promise<void>((resolve, reject) => {
      fs.createReadStream('./src/Updated_Token_Purchases_with_BID (1).csv')
        .pipe(csv())
        .on('data', (row) =>
          purchasesRows.push({
            BID: row.BID,
            Remaining_Claimable_Tokens: parseFloat(
              row.Remaining_Claimable_Tokens,
            ),
          }),
        )
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`CSV file read successfully with ${purchasesRows.length} rows`);

    const chunks = [];
    for (let i = 0; i < purchasesRows.length; i += CHUNK_SIZE) {
      chunks.push(purchasesRows.slice(i, i + CHUNK_SIZE));
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
