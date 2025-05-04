import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { WithdrawTransaction } from '../wallet/schemas/withdraw.transaction.schema';
import { WalletTransaction } from '../wallet/schemas/wallet.transaction.schema.';
import { DepositData } from '../utils/json/depositData';
import { User } from '../users/schemas/user.schema';
import { Wallet } from '../wallet/schemas/wallet.schema';
import { DepositTransaction } from '../wallet/schemas/deposit.transaction.schema';
import { TrxType } from '../global/enums/trx.type.enum';
import { Token } from '../token/schemas/token.schema';
import { WalletService } from '../wallet/wallet.service';
import { DepositTransactionHistory } from '../wallet/schemas/deposit.history.transaction.schema';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const depositTransaction = appContext.get<Model<DepositTransaction>>(
    DepositTransaction.name + 'Model',
  );

  const depositTransactionHistory = appContext.get<
    Model<DepositTransactionHistory>
  >(DepositTransactionHistory.name + 'Model');

  const wallettransactions = appContext.get<Model<WalletTransaction>>(
    WalletTransaction.name + 'Model',
  );

  const walletModel = appContext.get<Model<Wallet>>(Wallet.name + 'Model');
  const tokenModel = appContext.get<Model<Token>>(Token.name + 'Model');

  const userModel = appContext.get<Model<User>>(User.name + 'Model');

  const walletService = appContext.get(WalletService);
  const depositData = DepositData;
  if (depositData.length < 0) {
    process.exit(0);
  }

  const tokenData = await tokenModel.findOne({
    symbol: 'lyk-w',
    deleatedAt: null,
  });

  if (!tokenData) {
    process.exit(0);
  }

  for (let index = 0; index < depositData.length; index++) {
    const element: any = depositData[index];
    const userData = await userModel.findOne({
      blockchainId: element.bid,
      deletedAt: null,
    });
    if (!userData) continue;
    const walletData = await walletModel.findOne({
      user: userData._id,
      token: tokenData.id,
      deletedAt: null,
    });
    if (!walletData) continue;

    const deductAmount = 0 - element.amount;

    const { walletBalance } = await walletService.getBalanceByWallet(
      userData._id as any,
      walletData._id as any,
    );

    // create a wallet transcation -OUT
    const walletTranData = await wallettransactions.create({
      user: userData._id,
      wallet: walletData._id,
      trxType: 'deposit',
      amount: element.amount,
      transactionFlow: 'out',
      note: 'Received amount multiple time from wallek.',
      meta: element,
    });

    const depositTranData = await depositTransaction.findOne({
      user: userData._id,
      amount: element.amount,
      confirmation: 'Wallek Data Transfered',
    });
    if (!depositTranData) continue;

    const { requestId, serialNumber } =
      await walletService.generateUniqueRequestId(TrxType.DEPOSIT);

    const newDeposit = await depositTransaction.create({
      ...depositTranData.toObject(),
      _id: undefined,
      requestId,
      serialNumber,
      toWalletTrx: walletTranData._id,
      amount: deductAmount,
      confirmation: 'Received amount multiple time from wallek.',
      remarks: 'Received amount multiple time from wallek.',
      note: 'Received amount multiple time from wallek.',
      previousBalance: walletBalance,
      newBalance: walletBalance + deductAmount,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const depositTranHistoryData = await depositTransactionHistory.findOne({
      deposit_id: depositTranData._id,
    });

    if (!depositTranHistoryData) continue;
    const newDepositHistory = new depositTransactionHistory({
      ...depositTranHistoryData.toObject(),
      _id: undefined,
      requestId,
      serialNumber,
      toWalletTrx: walletTranData._id,
      amount: deductAmount,
      confirmation: 'Received amount multiple time from wallek.',
      remarks: 'Received amount multiple time from wallek.',
      note: 'Received amount multiple time from wallek.',
      previousBalance: walletBalance,
      newBalance: walletBalance + deductAmount,
      deposit_id: newDeposit._id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await newDepositHistory.save();
  }

  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
