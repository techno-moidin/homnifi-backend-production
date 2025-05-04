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
    '../../uploads/wallets/test-clfi-w.xlsx',
  );
  if (!fs.existsSync(excelFilePath)) {
    console.error('Excel file not found:', excelFilePath);
    return;
  }

  const workbook = XLSX.readFile(excelFilePath, { cellDates: true });
  const sheetNames = ['Sheet1'];
  // const tokenSymbol= ["usdk-w", "usdk-c"];

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
  rows: { SourceId: string; Balance: number }[],
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
  batch: { SourceId: string; Balance: number }[],
  userModel: Model<User>,
  tokenModel: Model<Token>,
  platformModel: Model<Platform>,
  myBlockchainIdService: MyBlockchainIdService,
  walletService: WalletService,
) {
  // const SourceIds = batch.map(item => item.SourceId.toString().length < 10 ? item.SourceId.toString().padStart(10, '0') : item.SourceId);
  const toToken = await tokenModel.findOne({ symbol: 'clfi-r' }).lean().exec();

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
  const skipedData = [];
  for (const item of batch) {
    console.log(`Source ID: ${item.SourceId}, Balance: ${item.Balance}, `);
    if (item.Balance == 0) {
      console.error(`balance is zero for ${item.SourceId}`);
      continue;
    }

    if (item.SourceId.toString().length < 10) {
      item.SourceId = item.SourceId.toString().padStart(10, '0');
    }
    const user = await myBlockchainIdService.syncUserByBid(item.SourceId);

    if (!user) {
      skipedData.push(item);
      continue;
    }

    // Get user wallet
    const userWallet = await walletService.findUserWalletByTokenSymbol(
      'clfi-r',
      user._id,
    );
    if (!userWallet) {
      console.error(`Wallet not found for user ${user._id}`);
      continue;
    }
    // let trx;
    const { walletBalance } = await walletService.getBalanceByWallet(
      user._id,
      userWallet._id,
    );

    // Create a wallet transaction
    const toWalletTransaction = await walletService.createRawWalletTransaction({
      user: user._id,
      wallet: userWallet._id,
      trxType: TrxType.MIGRATE,
      amount: item.Balance,
      transactionFlow: TransactionFlow.IN,
      token: userWallet.token,
      meta: {
        bid: user.blockchainId,
        note: 'Cloudk wallet  Migration',
        actutalBid: item.SourceId,
      },
      deletedAt: new Date(),
    });

    const trx = toWalletTransaction[0]?.['_id'];

    const { requestId, serialNumber } =
      await walletService.generateUniqueRequestId(TrxType.MIGRATE);
    const balance = walletBalance;
    const newDeposit = new walletService.depositTransactionModel({
      fromToken: userWallet.token,
      user: user._id,
      toWallet: userWallet._id,
      toWalletTrx: trx,
      amount: item.Balance,
      confirmation: 'Cloudk wallet Migration',
      serialNumber,
      requestId,
      transactionStatus: TransactionStatus.SUCCESS,
      remarks: `Migration ${item.Balance} ${toToken.name} from Cloudk wallet successfully deposited`,
      platform: platform?._id || null,
      newBalance: balance + item.Balance,
      previousBalance: balance,
      network: null,
      token: toToken._id,
      blockchainId: user?.blockchainId || null,
      isOnChainDeposit: false,
      deletedAt: new Date(),
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
        amount: item.Balance,
        confirmation: 'Cloudk wallet Migration',
        serialNumber,
        requestId,
        transactionStatus: TransactionStatus.SUCCESS,
        remarks: `Migration ${item.Balance} ${toToken.name} from Cloudk wallet successfully deposited`,
        platform: platform?._id || null,
        newBalance: balance + item.Balance,
        previousBalance: balance,
        network: null,
        token: toToken._id,
        blockchainId: user?.blockchainId || null,
        isOnChainDeposit: false,
        deletedAt: new Date(),
      });

    await newDepositTransactionHistory.save();

    console.log(`Processed SourceId: ${user.blockchainId} successfully`);
  }
  if (skipedData.length > 0) {
    fs.writeFileSync('skipped_data.json', JSON.stringify(skipedData, null, 2));
    console.log(`Skipped data written to skipped_data.json`);
  } else {
    console.log(`No skipped data to write.`);
  }
}

// Start the script
bootstrap().catch((err) => {
  console.error('Error bootstrapping application:', err);
  process.exit(1);
});
