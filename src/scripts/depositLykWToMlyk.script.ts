import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model, Types } from 'mongoose';
import { WithdrawTransaction } from '../wallet/schemas/withdraw.transaction.schema';
import { WalletTransaction } from '../wallet/schemas/wallet.transaction.schema.';
import { DepositTransaction } from '../wallet/schemas/deposit.transaction.schema';
import { User } from '../users/schemas/user.schema';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Token } from '../token/schemas/token.schema';
import { WalletService } from '../wallet/wallet.service';
import { CloudKService } from '../cloud-k/cloud-k.service';
import { TrxType } from '../global/enums/trx.type.enum';
import { DepositTransactionHistory } from '../wallet/schemas/deposit.history.transaction.schema';
import { CloudKAutoCompoundSetting } from '../cloud-k/schemas/cloudk-autoCompound-setting.schema';
import { CloudKMachine } from '../cloud-k/schemas/cloudk-machine.schema';

async function readJsonFile(filePath: string) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading JSON file:', error);
    throw new Error('Failed to load JSON file');
  }
}

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);

  const jsonFilePath = path.join(
    __dirname,
    '../../uploads/json/depositTransactionLykWToMlyK.json',
  );

  console.log('Processing start.');

  const configData = await readJsonFile(jsonFilePath);

  const deposittransactions = appContext.get<Model<DepositTransaction>>(
    DepositTransaction.name + 'Model',
  );

  const cloudKAutoCompoundSetting = appContext.get<
    Model<CloudKAutoCompoundSetting>
  >(CloudKAutoCompoundSetting.name + 'Model');

  const cloudkmachines = appContext.get<Model<CloudKMachine>>(
    CloudKMachine.name + 'Model',
  );

  const depositTransactionHistory = appContext.get<
    Model<DepositTransactionHistory>
  >(DepositTransactionHistory.name + 'Model');

  const UserModel = appContext.get<Model<User>>(User.name + 'Model');
  const wallettransactions = appContext.get<Model<WalletTransaction>>(
    WalletTransaction.name + 'Model',
  );

  const tokenModel = appContext.get<Model<Token>>(Token.name + 'Model');

  const walletService = appContext.get(WalletService);
  const cloudKService = appContext.get(CloudKService);

  if (!configData) {
    process.exit(0);
  }

  const tokenData = await tokenModel.findOne({
    symbol: 'due',
    deletedAt: null,
  });

  for (let index = 0; index < configData.length; index++) {
    const element = configData[index];

    const transaction = await deposittransactions
      .findOne({
        _id: new Types.ObjectId(element._id),
        amount: element.amount,
        deletedAt: null,
      })
      .populate('toWallet toWalletTrx');

    if (!transaction) {
      console.log('Transaction', transaction?._id);
      continue;
    }

    console.log('Processing.');

    // Find User Wallet
    const userWallet = await walletService.findUserWalletByTokenSymbol(
      tokenData.symbol,
      transaction.user as any,
    );

    //convert to LykW to usd

    const { price } = await cloudKService.getCurrentPrice();
    const lykToUsdAmount = price * transaction.amount;

    //add wallet tranaction

    const walletTranData = await wallettransactions.create({
      user: transaction.user,
      wallet: userWallet._id,
      trxType: 'deposit',
      amount: lykToUsdAmount,
      transactionFlow: 'in',
      note: 'By script ',
      meta: {
        lykPrice: price,
        tokenAmount: transaction.amount,
        depositId: transaction._id,
      },
    });

    // add deposit transaction

    const { requestId, serialNumber } =
      await walletService.generateUniqueRequestId(TrxType.DEPOSIT);
    console.log('requestId.');

    const newDeposit = await deposittransactions.create({
      ...transaction.toObject(),
      _id: undefined,
      requestId,
      serialNumber,
      toWallet: userWallet._id,
      toWalletTrx: walletTranData._id,
      amount: lykToUsdAmount,
      confirmation: 'By Script.',
      remarks: 'By Script.',
      note: `lykPrice: ${price}, tokenAmount: ${transaction.amount}, depositId: ${transaction._id},`,
      previousBalance: 0,
      newBalance: lykToUsdAmount,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const depositTranHistoryData = await depositTransactionHistory.findOne({
      deposit_id: transaction._id,
    });

    if (!depositTranHistoryData) continue;
    const newDepositHistory = new depositTransactionHistory({
      ...depositTranHistoryData.toObject(),
      _id: undefined,
      requestId,
      serialNumber,
      toWallet: userWallet._id,
      toWalletTrx: walletTranData._id,
      amount: lykToUsdAmount,
      confirmation: 'By Script.',
      remarks: 'By Script.',
      note: `lykPrice: ${price}, tokenAmount: ${transaction.amount}, depositId: ${transaction._id},`,
      previousBalance: 0,
      newBalance: lykToUsdAmount,
      deposit_id: newDeposit._id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await newDepositHistory.save();

    if (transaction.user) {
      const createAutocomponantSetting =
        await cloudKService.createOrUpdateAutoCompoundSetting({
          user: transaction.user,
          isUpdate: false,
        });
    }
  }

  console.log('Processing complete.');
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
