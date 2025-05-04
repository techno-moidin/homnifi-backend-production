import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import mongoose, { Model, Types } from 'mongoose';
import { WithdrawTransaction } from '../wallet/schemas/withdraw.transaction.schema';
import { WalletTransaction } from '../wallet/schemas/wallet.transaction.schema.';
import { DepositTransaction } from '../wallet/schemas/deposit.transaction.schema';
import { DepositTransactionHistory } from '../wallet/schemas/deposit.history.transaction.schema';
import { CloudKMachine } from '../cloud-k/schemas/cloudk-machine.schema';
import { getCustomRange } from '../utils/common/common.functions';
import {
  Deposit_Transaction_Type,
  TrxType,
} from '../global/enums/trx.type.enum';
import { TransactionFlow } from '../wallet/enums/transcation.flow.enum';
import { WalletService } from '../wallet/wallet.service';
import { TransactionStatus } from '../global/enums/transaction.status.enum';
import { Platform } from '../platform/schemas/platform.schema';
import { CloudKService } from '../cloud-k/cloud-k.service';
import { CloudKTransactionTypes } from '../cloud-k/schemas/cloudk-transactions.schema';
import {
  CLOUDK_MACHINE_STAKE_TYPE,
  STAKE_FROM,
} from '../cloud-k/schemas/cloudk-machine-stakes.schema';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const cloudKMachine = appContext.get<Model<CloudKMachine>>(
    CloudKMachine.name + 'Model',
  );
  const wallettransactions = appContext.get<Model<WalletTransaction>>(
    WalletTransaction.name + 'Model',
  );

  const platformModel = appContext.get<Model<Platform>>(
    Platform.name + 'Model',
  );

  const walletService = appContext.get(WalletService);
  const cloudKService = appContext.get(CloudKService);
  const from = new Date('2024-12-17T17:00:00Z');
  const to = new Date('2025-01-06T00:00:00Z');

  const reportJson = [];

  const excludedMachineIds = [
    new mongoose.Types.ObjectId('676578cadd063f1ea3f77e47'),
    new mongoose.Types.ObjectId('676580cbdd063f1ea3f85038'),
    new mongoose.Types.ObjectId('67658c389810f43b0b95a654'),
  ];

  const customdate = await getCustomRange(from, to);
  const transactions = await cloudKMachine
    .find({
      _id: { $nin: excludedMachineIds },
      createdAt: {
        $gte: from,
        $lt: to,
      },
      deletedAt: null,
    })
    .populate('user')
    .exec();
  if (transactions.length < 0) {
    process.exit(0);
  }

  console.log('transaction', transactions.length);

  //   676578cadd063f1ea3f77e47
  // 676580cbdd063f1ea3f85038
  // 67658c389810f43b0b95a654

  const platformData = await platformModel.findOne({
    symbol: 'homnifi',
    deletedAt: null,
  });

  const BATCH_SIZE = 10000;

  const processTransaction = async (transaction: any, arraydata: any[]) => {
    if (!transaction || !transaction.user) {
      return;
    }
    const { price } = await cloudKService.getCurrentPrice();

    console.log(transaction?.user?._id);

    const walletData: any = await walletService.findUserWalletByTokenSymbol(
      'mlyk',
      transaction.user._id,
    );
    // await wallettransactions
    //   .findOne({
    //     machine: transaction._id,
    //     trxType: TrxType.LAUNCHPAD_AIRDROP,
    //     deletedAt: null,
    //     transactionFlow: 'in',
    //   })
    //   .populate('user wallet');

    if (!walletData) {
      return;
    }
    const percentageExtra = (10 / 100) * transaction.productPrice;

    const tokenAmount = percentageExtra / price;
    const { walletBalance } = await walletService.getBalanceByWallet(
      transaction.user._id as any,
      walletData._id as any,
    );
    const rawWalletTransaction = await walletService.createRawWalletTransaction(
      {
        amount: tokenAmount,
        wallet: walletData._id as any,
        transactionFlow: TransactionFlow.IN,
        trxType: TrxType.DEPOSIT,
        user: transaction.user._id as any,
        machine: transaction._id as any,
        note: `Christmas Promotion for Minter Purchase: ${transaction.uniqueName}`,
        meta: {
          lykPrice: price,
          percentageExtra,
          productPrice: transaction.productPrice,
        },
      },
    );
    const trx = rawWalletTransaction[0]?.['_id'] || null;

    const { requestId, serialNumber } =
      await walletService.generateUniqueRequestId(TrxType.DEPOSIT);

    const totalWalletAmountTemp = tokenAmount + walletBalance;
    const [depositTransactiondata] = await Promise.all([
      walletService.depositTransactionModel.create([
        {
          user: transaction.user._id,
          toWallet: walletData._id,
          toWalletTrx: trx,
          amount: tokenAmount,
          confirmation: '',
          hash: '',
          onChainWallet: null,
          serialNumber: serialNumber,
          requestId,
          transactionStatus: TransactionStatus.SUCCESS,
          remarks: `Christmas Promotion for Minter Purchase: ${transaction.uniqueName}`,
          settingsUsed: null,
          newBalance: totalWalletAmountTemp,
          previousBalance: walletBalance,
          platform: platformData._id,
          token: walletData?.token._id || null,
          network: null,
          blockchainId: transaction.user.blockchainId || null,
          note: `Christmas Promotion for Minter Purchase: ${transaction.uniqueName}`,
        },
      ]),
    ]);
    await walletService.depositTransactionHistoryModel.create([
      {
        deposit_id: depositTransactiondata[0]._id,
        from: Deposit_Transaction_Type.Deposit,
        user: transaction.user._id,
        toWallet: walletData._id,
        toWalletTrx: trx,
        amount: tokenAmount,
        confirmation: '',
        hash: '',
        type: rawWalletTransaction[0]?.['trxType'] || 'deposit',
        onChainWallet: null,
        serialNumber: serialNumber,
        requestId,
        transactionStatus: TransactionStatus.SUCCESS,
        remarks: `Christmas Promotion for Minter Purchase: ${transaction.uniqueName}`,
        settingsUsed: null,
        newBalance: totalWalletAmountTemp,
        previousBalance: walletBalance,
        platform: platformData._id,
        token: walletData?.token?._id || null,
        network: null,
        blockchainId: transaction.user.blockchainId || null,
        note: `Christmas Promotion for Minter Purchase: ${transaction.uniqueName}`,
      },
    ]);

    const currentTotalStakedInMachine =
      await cloudKService.getMachineTotalCollatoral(
        transaction._id as Types.ObjectId,
      ); // must come in dollars

    if (
      transaction.stakeLimit &&
      transaction.stakeLimit < currentTotalStakedInMachine + percentageExtra
    ) {
      return;
    }

    await walletService.createRawWalletTransaction({
      amount: tokenAmount,
      wallet: walletData._id as any,
      transactionFlow: TransactionFlow.OUT,
      trxType: TrxType.STAKE,
      user: transaction.user._id as any,
      machine: transaction._id as any,
      note: `Christmas Promotion for Minter Purchase: ${transaction.uniqueName}`,
      meta: {
        lykPrice: price,
        percentageExtra,
        productPrice: transaction.productPrice,
      },
    });

    const stake = await cloudKService.addStake({
      session: null,
      machineId: transaction._id,
      userId: transaction.user._id,
      type: CLOUDK_MACHINE_STAKE_TYPE.STAKE,
      from: STAKE_FROM.MORE_STAKE,
      totalToken: tokenAmount,
      lykPrice: price,
      walletTransactionId: null,
      extraMessage: `Christmas Promotion for Minter Purchase: ${transaction.uniqueName}`,
      actualValue: tokenAmount,
      // bonusAmount: bonusAmount,
    });

    await cloudKService.createCloudKTransaction({
      tokenAmount: tokenAmount,
      type: CloudKTransactionTypes.ADD_STAKE,
      user: transaction.user._id,
      machine: transaction._id as Types.ObjectId,
      totalTokenPrice: price * tokenAmount,
      token: walletData._id,
      lykPrice: price,
      stake: String(stake._id),
      note: `Christmas Promotion for Minter Purchase: ${transaction.uniqueName}`,
    });

    console.log('Updating transaction:', transaction._id);
  };

  const processBatch = async (batch: any[]) => {
    const arraydata = [];
    await Promise.all(
      batch.map((transaction) => processTransaction(transaction, arraydata)),
    );
    console.log('Array Data for this batch:', arraydata);

    await wallettransactions.bulkWrite(arraydata);
  };

  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    const batch = transactions.slice(i, i + BATCH_SIZE);
    await processBatch(batch);
  }
  console.log('Processing complete.');
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
