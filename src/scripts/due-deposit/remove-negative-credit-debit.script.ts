import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { Model, Types } from 'mongoose';
import { WithdrawTransaction } from '../../wallet/schemas/withdraw.transaction.schema';
import { WalletTransaction } from '../../wallet/schemas/wallet.transaction.schema.';
import { DepositTransaction } from '../../wallet/schemas/deposit.transaction.schema';
import { User } from '../../users/schemas/user.schema';
import { Token } from '../../token/schemas/token.schema';
import { WalletService } from '../../wallet/wallet.service';
import { CloudKService } from '../../cloud-k/cloud-k.service';
import { TrxType } from '../../global/enums/trx.type.enum';
import { DepositTransactionHistory } from '../../wallet/schemas/deposit.history.transaction.schema';
import { Wallet } from '../../wallet/schemas/wallet.schema';
import { TransactionFlow } from '../../wallet/enums/transcation.flow.enum';
import { WITHDRAW_TYPES } from '../../token/enums/withdraw-types.enum';
import { RequestStatus } from '../../wallet/enums/request.status.enum';
import { Platform } from '../../platform/schemas/platform.schema';
import { TransactionStatus } from '../../global/enums/transaction.status.enum';
import { ObjectId } from 'mongodb';
import { ChargesType } from '@/src/global/enums/charges.type.enum';

async function bootstrap() {
  console.log('=== SCRIPT INITIALIZATION ===');
  console.log('• Starting application context...');
  const appContext = await NestFactory.createApplicationContext(AppModule);
  console.log('✓ Application context created successfully');

  // Getting model references
  console.log('\n=== INITIALIZING DATABASE MODELS ===');
  const withdrawTransactionModel = appContext.get<Model<WithdrawTransaction>>(
    WithdrawTransaction.name + 'Model',
  );
  const deposittransactions = appContext.get<Model<DepositTransaction>>(
    DepositTransaction.name + 'Model',
  );

  const depositTransactionHistory = appContext.get<
    Model<DepositTransactionHistory>
  >(DepositTransactionHistory.name + 'Model');

  const UserModel = appContext.get<Model<User>>(User.name + 'Model');
  const wallettransactions = appContext.get<Model<WalletTransaction>>(
    WalletTransaction.name + 'Model',
  );

  const platformModel = appContext.get<Model<Platform>>(
    Platform.name + 'Model',
  );

  const walletModel = appContext.get<Model<Wallet>>(Wallet.name + 'Model');

  const tokenModel = appContext.get<Model<Token>>(Token.name + 'Model');
  console.log('✓ Database models initialized successfully');

  // Getting service references
  console.log('\n=== INITIALIZING SERVICES ===');
  const walletService = appContext.get(WalletService);
  const cloudKService = appContext.get(CloudKService);
  console.log('✓ Services initialized successfully');

  console.log('\n=== FETCHING REQUIRED DATA ===');
  console.log('• Retrieving current price...');
  const { price } = await cloudKService.getCurrentPrice();
  if (isNaN(price) || price === null || price === undefined) {
    console.error('❌ ERROR: Invalid price value:', price);
    console.error('❌ Script execution terminated.');
    process.exit(1);
  }
  console.log(`✓ Current price: ${price}`);

  console.log('• Finding platform...');
  const platform = await platformModel.findOne({
    symbol: 'homnifi',
    deletedAt: null,
  });
  if (!platform) {
    console.error('❌ ERROR: Platform "homnifi" not found');
    console.error('❌ Script execution terminated.');
    process.exit(1);
  }
  console.log(`✓ Platform found: ${platform._id} (${platform.symbol})`);

  console.log('• Finding DUE token...');
  const toTokenData = await tokenModel.findOne({
    symbol: 'due',
    deletedAt: null,
  });
  if (!toTokenData) {
    console.error('❌ ERROR: DUE token not found');
    console.error('❌ Script execution terminated.');
    process.exit(1);
  }
  console.log(`✓ DUE token found: ${toTokenData._id} (${toTokenData.symbol})`);

  console.log('\n=== FINDING WALLETS WITH NEGATIVE BALANCES ===');
  console.log('• Running aggregation pipeline...');
  const allWalletTransactions = await wallettransactions.aggregate([
    {
      $match: {
        deletedAt: { $eq: null },
        // user: new Types.ObjectId('67bf5edcde367ee6a849c672'),
      },
    },
    {
      $group: {
        _id: '$wallet',
        incomingBalance: {
          $sum: {
            $cond: [{ $eq: ['$transactionFlow', 'in'] }, '$amount', 0],
          },
        },
        outgoingBalance: {
          $sum: {
            $cond: [{ $eq: ['$transactionFlow', 'out'] }, '$amount', 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        balance: {
          $round: [
            {
              $subtract: ['$incomingBalance', '$outgoingBalance'],
            },
            10,
          ],
        },
      },
    },
    {
      $match: {
        balance: { $lt: 0 },
      },
    },
  ]);
  console.log(
    `✓ Found ${allWalletTransactions.length} wallets with negative balances to process`,
  );

  console.log('\n=== BEGINNING WALLET PROCESSING ===');
  for (let index = 0; index < allWalletTransactions.length; index++) {
    const element = allWalletTransactions[index];
    console.log(
      `\n----- PROCESSING WALLET ${index + 1}/${allWalletTransactions.length} -----`,
    );
    console.log(`• Wallet ID: ${element._id}`);
    console.log(`• Negative balance: ${element.balance}`);

    // Make sure we have a valid balance amount and it's a negative number
    if (
      !element.balance ||
      typeof element.balance !== 'number' ||
      element.balance >= 0
    ) {
      console.error(
        `❌ ERROR: Invalid balance value: ${element.balance}, skipping this wallet`,
      );
      continue;
    }

    // Use the absolute value of the balance
    const amountToProcess = Math.abs(element.balance);
    console.log(`• Amount to process: ${amountToProcess}`);

    console.log('\n[STEP 1] Finding wallet details');
    const walletData = await walletModel.findOne({
      _id: element._id,
      deletedAt: null,
    });

    if (!walletData) {
      console.error(
        `❌ ERROR: Wallet not found for ID: ${element._id}, skipping this wallet`,
      );
      continue;
    }
    console.log(`✓ Wallet found: ${walletData._id}`);

    console.log('\n[STEP 2] Finding associated user');
    const user = await UserModel.findById(walletData.user);
    if (!user) {
      console.error(
        `❌ ERROR: User not found for wallet: ${walletData._id}, skipping this wallet`,
      );
      continue;
    }
    console.log(`✓ User found: ${user._id}`);

    console.log('\n[STEP 3] Finding associated token');
    const fromTokenData = await tokenModel.findById(walletData.token);
    if (!fromTokenData) {
      console.error(
        `❌ ERROR: Token not found for wallet: ${walletData._id}, skipping this wallet`,
      );
      continue;
    }
    console.log(
      `✓ Token found: ${fromTokenData._id} (${fromTokenData.symbol})`,
    );

    console.log('\n[STEP 4] Getting wallet balance');
    const { walletBalance } = await walletService.getBalanceByWallet(
      user._id as Types.ObjectId,
      walletData._id as Types.ObjectId,
    );
    console.log(`✓ Current wallet balance: ${walletBalance}`);

    try {
      console.log('\n[STEP 5] Creating wallet transaction for correction');
      const createdWalletTrx = await wallettransactions.create({
        user: walletData.user,
        wallet: walletData._id,
        trxType: TrxType.WITHDRAW,
        amount: amountToProcess,
        transactionFlow: TransactionFlow.IN,
        note: 'Negative balance movement | HOM-2553',
        remark: 'Negative balance movement',
        meta: {
          lykPrice: price,
          tokenAmount: amountToProcess,
        },
        deletedAt: new Date(),
      });
      console.log(
        `✓ Wallet transaction created with ID: ${createdWalletTrx._id}`,
      );

      console.log('\n[STEP 6] Generating unique request ID for withdrawal');
      const {
        requestId: requestIdWithdraw,
        serialNumber: serialNumberWithdraw,
      } = await walletService.generateUniqueRequestId(TrxType.WITHDRAW);
      console.log(`✓ Generated request ID: ${requestIdWithdraw}`);
      console.log(`✓ Generated serial number: ${serialNumberWithdraw}`);

      console.log('\n[STEP 7] Creating withdraw transaction');
      const WithdrawTransaction = new withdrawTransactionModel({
        user: user._id,
        fromWallet: walletData._id,
        fromWalletTrx: createdWalletTrx._id,
        receiverAddress: user.blockchainId,
        amount: amountToProcess,
        total: amountToProcess,
        fee: 0,
        commission: 0,
        feeType: ChargesType.FIXED,
        commissionType: ChargesType.FIXED,
        requestStatus: RequestStatus.COMPLETED,
        withdrawType: WITHDRAW_TYPES.INTERNAL,
        serialNumber: serialNumberWithdraw,
        hash: 'transfer-to-debit-wallet',
        requestId: requestIdWithdraw,
        receiveToken: toTokenData._id,
        tokenPrice: price,
        settingsUsed: null,
        previousBalance: walletBalance,
        newBalance: 0,
        platform,
        token: fromTokenData._id || null,
        blockchainId: user?.blockchainId || null,
        meta: {
          lykPrice: price,
          tokenAmount: amountToProcess,
        },
        deletedAt: new Date(),
        note: 'Negative balance movement | HOM-2553',
        userRemarks: `${amountToProcess} ${fromTokenData.name} is debited for Negative balance movement`,
      });
      await WithdrawTransaction.save();
      console.log(
        `✓ Withdraw transaction saved with ID: ${WithdrawTransaction._id}`,
      );

      console.log('\n[STEP 8] Finding user wallet for DUE token');
      const userToWallet = await walletService.findUserWalletByTokenSymbol(
        toTokenData.symbol,
        walletData.user as any,
      );
      if (!userToWallet) {
        console.error(
          `❌ ERROR: User wallet not found for token: ${toTokenData.symbol}, skipping deposit creation`,
        );
        continue;
      }
      console.log(`✓ User DUE wallet found with ID: ${userToWallet._id}`);

      console.log('\n[STEP 9] Getting DUE wallet balance');
      const { walletBalance: toWalletBalance } =
        await walletService.getBalanceByWallet(
          user._id as Types.ObjectId,
          userToWallet._id as Types.ObjectId,
        );
      console.log(`✓ Current DUE wallet balance: ${toWalletBalance}`);

      console.log('\n[STEP 10] Calculating conversion amount');
      let negativeToDueAmount: number = 0;

      if (fromTokenData.valueType === 'lyk') {
        negativeToDueAmount = price * amountToProcess;
        console.log(
          `✓ Converting LYK amount: ${amountToProcess} × ${price} = ${negativeToDueAmount} DUE`,
        );
      } else {
        negativeToDueAmount = amountToProcess;
        console.log(`✓ Keeping original amount: ${negativeToDueAmount} DUE`);
      }

      // Check for NaN or invalid values
      if (isNaN(negativeToDueAmount) || negativeToDueAmount <= 0) {
        console.error(
          `❌ ERROR: Invalid conversion amount: ${negativeToDueAmount}, skipping deposit creation`,
        );
        continue;
      }

      console.log('\n[STEP 11] Creating wallet transaction for DUE wallet');
      const walletTranData = await wallettransactions.create({
        user: walletData.user,
        wallet: userToWallet._id,
        trxType: 'deposit',
        amount: negativeToDueAmount,
        transactionFlow: TransactionFlow.IN,
        note: 'negative balance movement | HOM-2553',
        meta: {
          lykPrice: price,
          tokenAmount: amountToProcess,
        },
        deletedAt: new Date(),
      });
      console.log(
        `✓ DUE wallet transaction created with ID: ${walletTranData._id}`,
      );

      console.log('\n[STEP 12] Generating unique request ID for deposit');
      const { requestId, serialNumber } =
        await walletService.generateUniqueRequestId(TrxType.DEPOSIT);
      console.log(`✓ Generated request ID: ${requestId}`);
      console.log(`✓ Generated serial number: ${serialNumber}`);

      console.log('\n[STEP 13] Creating deposit transaction');
      const newDeposit = await deposittransactions.create({
        fromToken: userToWallet.token,
        token: userToWallet.token,
        user: user._id,
        requestId,
        serialNumber,
        toWallet: userToWallet._id,
        toWalletTrx: walletTranData._id,
        amount: negativeToDueAmount,
        transactionStatus: TransactionStatus.SUCCESS,
        type: 'transfer',
        hash: 'transfer-to-debit-wallet',
        confirmation: '-',
        remarks: `${negativeToDueAmount} ${toTokenData.name} is credited for Negative balance movement`,
        platform: platform?._id || null,
        note: `lykPrice: ${price}, tokenAmount: ${amountToProcess}`,
        newBalance: toWalletBalance + negativeToDueAmount,
        previousBalance: toWalletBalance,
        network: null,
        deletedAt: new Date(),
      });
      console.log(`✓ Deposit transaction created with ID: ${newDeposit._id}`);

      console.log('\n[STEP 14] Creating deposit transaction history');
      const newDepositHistory = await depositTransactionHistory.create({
        fromToken: userToWallet.token,
        token: userToWallet.token,
        user: user._id,
        requestId,
        serialNumber,
        toWallet: userToWallet._id,
        toWalletTrx: walletTranData._id,
        amount: negativeToDueAmount,
        transactionStatus: TransactionStatus.SUCCESS,
        type: 'transfer',
        hash: 'transfer-to-debit-wallet',
        confirmation: '-',
        remarks: `${negativeToDueAmount} ${toTokenData.name} is credited for Negative balance movement`,
        platform: platform?._id || null,
        note: `lykPrice: ${price}, tokenAmount: ${amountToProcess}`,
        newBalance: toWalletBalance + negativeToDueAmount,
        previousBalance: toWalletBalance,
        network: null,
        deposit_id: newDeposit._id,
        deletedAt: new Date(),
      });
      console.log(
        `✓ Deposit transaction history created with ID: ${newDepositHistory._id}`,
      );

      // Update the auto-compound section with proper error handling:
      console.log(
        '\n[STEP 15] Skipping socket notification (known issue in script context)',
      );
      try {
        if (walletData) {
          // Skip the socket notification part but still create the auto compound setting
          const createAutocomponantSetting =
            await cloudKService.createOrUpdateAutoCompoundSetting({
              user: walletData.user,
              isUpdate: false,
              skipNotification: true, // Add this flag if your service supports it
            });
          console.log(
            `✓ Auto compound setting ${createAutocomponantSetting ? 'created/updated' : 'failed'}`,
          );
        }
      } catch (error) {
        // Log the error but don't let it crash the script
        console.error(`❌ Error with auto compound setting: ${error.message}`);
        console.log('  Continuing script execution...');
      }

      console.log(
        `\n✅ WALLET ${index + 1}/${allWalletTransactions.length} PROCESSED SUCCESSFULLY ✅`,
      );
    } catch (error) {
      console.error(
        `\n❌ ERROR PROCESSING WALLET ${index + 1}/${allWalletTransactions.length}:`,
      );
      console.error(`❌ Error message: ${error.message}`);
      console.error(`❌ Stack trace:`);
      console.error(error.stack);
      console.error(`❌ Continuing to next wallet...\n`);
      continue;
    }
  }

  console.log('\n=== SCRIPT SUMMARY ===');
  console.log(`✅ All ${allWalletTransactions.length} wallets processed!`);
  console.log('✅ Script execution completed successfully.');
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('\n❌ FATAL ERROR EXECUTING SCRIPT:');
  console.error(`❌ Error message: ${err.message}`);
  console.error('❌ Stack trace:');
  console.error(err.stack);
  console.error('❌ Script execution terminated.');
  process.exit(1);
});
