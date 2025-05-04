import { MyBlockchainIdService } from '@/src/my-blockchain-id/my-blockchain-id.service';
import { NestFactory } from '@nestjs/core';
import fs from 'fs';
import { Model } from 'mongoose';
import path from 'path';
import * as XLSX from 'xlsx';
import { AppModule } from '../app.module';
import { TransactionStatus } from '../global/enums/transaction.status.enum';
import {
  Deposit_Transaction_Type,
  TrxType,
} from '../global/enums/trx.type.enum';
import { Platform } from '../platform/schemas/platform.schema';
import { Token } from '../token/schemas/token.schema';
import { User } from '../users/schemas/user.schema';
import { TransactionFlow } from '../wallet/enums/transcation.flow.enum';
import { WalletService } from '../wallet/wallet.service';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  console.log('Application bootstrapped successfully');

  const userModel = appContext.get<Model<User>>('UserModel');
  const tokenModel = appContext.get<Model<Token>>('TokenModel');
  const platformModel = appContext.get<Model<Platform>>('PlatformModel');
  const myBlockchainIdService = appContext.get(MyBlockchainIdService);
  const walletService = appContext.get(WalletService);

  const excelFilePath = path.join(
    __dirname,
    '../../uploads/usdk-refund/failed-membership.xlsx',
  );
  if (!fs.existsSync(excelFilePath)) {
    console.error('Excel file not found:', excelFilePath);
    return;
  }

  const workbook = XLSX.readFile(excelFilePath, { cellDates: true });
  const sheetNames = ['USDK'];

  const rows: any = XLSX.utils.sheet_to_json(workbook.Sheets[sheetNames[0]], {
    raw: true,
  });
  console.log(`Loaded ${rows.length} records from Excel.`);

  await processBatches(
    rows,
    userModel,
    tokenModel,
    platformModel,
    myBlockchainIdService,
    walletService,
  );
  console.log('All records processed.');
  process.exit(0);
}

async function processBatches(
  rows: { SourceId: string; USDKRefund: number; PurchaseDate: string }[],
  userModel: Model<User>,
  tokenModel: Model<Token>,
  platformModel: Model<Platform>,
  myBlockchainIdService: any,
  walletService: WalletService,
) {
  const BATCH_SIZE = 1000; // Adjust batch size as needed
  const totalBatches = Math.ceil(rows.length / BATCH_SIZE);

  console.log(
    `Total Records: ${rows.length}, Processing in ${totalBatches} batches...`,
  );

  for (let i = 0; i < totalBatches; i++) {
    const batch = rows.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
    console.log(`Processing batch ${i + 1} of ${totalBatches}...`);

    await processBatch(
      batch,
      userModel,
      tokenModel,
      platformModel,
      myBlockchainIdService,
      walletService,
    );
  }

  console.log('All batches processed successfully.');
}

async function processBatch(
  batch: { SourceId: string; USDKRefund: number; PurchaseDate: string }[],
  userModel: Model<User>,
  tokenModel: Model<Token>,
  platformModel: Model<Platform>,
  myBlockchainIdService: MyBlockchainIdService,
  walletService: WalletService,
) {
  // const SourceIds = batch.map(item => item.SourceId.toString().length < 10 ? item.SourceId.toString().padStart(10, '0') : item.SourceId);
  const toToken = await tokenModel.findOne({ symbol: 'usdk' }).lean().exec();

  if (!toToken) {
    console.error('Token not found');
    return;
  }

  const platform = await platformModel
    .findOne({ symbol: 'homnifi' })
    .lean()
    .exec();
  console.log('Platform:', platform);

  if (!platform) {
    console.error('Platform not found');
    return;
  }

  for (const item of batch) {
    console.log(item, 'item');
    console.log(
      `Source ID: ${item.SourceId}, USDKRefund: ${item.USDKRefund}, PurchaseDate: ${item.PurchaseDate}`,
    );
    if (item.SourceId.toString().length < 10) {
      item.SourceId = item.SourceId.toString().padStart(10, '0');
    }
    const user = await myBlockchainIdService.syncUserByBid(item.SourceId);

    if (!user) {
      console.error(`User not found for SourceId ${item.SourceId}`);
      return;
    }

    // Get user wallet
    const userWallet = await walletService.findUserWalletByTokenSymbol(
      'usdk',
      user._id,
    );
    if (!userWallet) {
      console.error(`Wallet not found for user ${user._id}`);
      return;
    }
    let trx;
    const { walletBalance } = await walletService.getBalanceByWallet(
      user._id,
      userWallet._id,
    );

    // Create a wallet transaction
    const toWalletTransaction = await walletService.createRawWalletTransaction({
      user: user._id,
      wallet: userWallet._id,
      trxType: TrxType.MIGRATE,
      amount: item.USDKRefund,
      transactionFlow: TransactionFlow.IN,
      token: userWallet.token,
      meta: {
        bid: user.blockchainId,
        note: 'Refund for Failed Membership Purchase',
        PurchaseDate: item.PurchaseDate,
        actutalBid: item.SourceId,
      },
    });

    trx = toWalletTransaction[0]?.['_id'];

    const { requestId, serialNumber } =
      await walletService.generateUniqueRequestId(TrxType.MIGRATE);
    const balance = walletBalance;
    const newDeposit = new walletService.depositTransactionModel({
      fromToken: userWallet.token,
      user: user._id,
      toWallet: userWallet._id,
      toWalletTrx: trx,
      amount: item.USDKRefund,
      confirmation: 'Refund for Failed Membership Purchase',
      serialNumber,
      requestId,
      transactionStatus: TransactionStatus.SUCCESS,
      remarks: `Refund for Failed Membership Purchase`,
      platform: platform?._id || null,
      newBalance: balance + item.USDKRefund,
      previousBalance: balance,
      network: null,
      token: toToken._id,
      blockchainId: user?.blockchainId || null,
      isOnChainDeposit: false,
    });

    await newDeposit.save();

    const newDepositTransactionHistory: any =
      new walletService.depositTransactionHistoryModel({
        deposit_id: newDeposit._id,
        from: Deposit_Transaction_Type.Deposit,
        type: TrxType.MIGRATE,
        fromToken: userWallet.token,
        user: user._id,
        toWallet: userWallet._id,
        toWalletTrx: trx,
        amount: item.USDKRefund,
        confirmation: 'Refund for Failed Membership Purchase',
        serialNumber,
        requestId,
        transactionStatus: TransactionStatus.SUCCESS,
        remarks: `Migration ${item.USDKRefund} ${toToken.name} from XPRO successfully deposited`,
        platform: platform?._id || null,
        newBalance: balance + item.USDKRefund,
        previousBalance: balance,
        network: null,
        token: toToken._id,
        blockchainId: user?.blockchainId || null,
        isOnChainDeposit: false,
      });

    await newDepositTransactionHistory.save();

    console.log(`Processed SourceId: ${user.blockchainId} successfully`);
  }
}

// Start the script
bootstrap().catch((err) => {
  console.error('Error bootstrapping application:', err);
  process.exit(1);
});
