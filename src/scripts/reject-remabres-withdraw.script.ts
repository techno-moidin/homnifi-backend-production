import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { WithdrawTransaction } from '../wallet/schemas/withdraw.transaction.schema';
import { WalletTransaction } from '../wallet/schemas/wallet.transaction.schema.';
import { Wallet } from '../wallet/schemas/wallet.schema';
import { TrxType } from '../global/enums/trx.type.enum';
import { TransactionFlow } from '../wallet/enums/transcation.flow.enum';
import { WalletService } from '../wallet/wallet.service';
import { Token } from '../token/schemas/token.schema';
import { RequestStatus } from '../wallet/enums/request.status.enum';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const withdrawTransaction = appContext.get<Model<WithdrawTransaction>>(
    WithdrawTransaction.name + 'Model',
  );
  const walletTransactionModel = appContext.get<Model<WalletTransaction>>(
    WalletTransaction.name + 'Model',
  );

  const tokenModel = appContext.get<Model<Token>>(
    Token.name + 'Model',
  );

  const walletService = appContext.get(WalletService);

  //   66ae21da0bba7f300e1e3bff
  const users = [
    '66dd09ae3a7cb0da1ee6f924',
    '66ae250b0bba7f300e1ee054',
    '66ae21da0bba7f300e1e3bff',
  ];

  for (let index = 0; index < users.length; index++) {
    const element: any = users[index];

    const transaction: any = await withdrawTransaction
      .find({ user: element, requestStatus: 'pending' })
      .populate('fromWallet')
      .exec();
    if (transaction.length < 0) {
      ;
      process.exit(0);
      return;
    }
const withdrawRequest = transaction[0]
    const fromWallet = withdrawRequest.fromWallet;

    const token = await tokenModel.findById(fromWallet.token);
    ;

    const reimbersedRecord = await walletService.withdrawAmountReimberse(
        withdrawRequest,
      );


      const updatedRequest =
        await walletTransactionModel.findByIdAndUpdate(
          withdrawRequest._id,
          {
            requestStatus: RequestStatus.REJECTED_AND_REIMBERSED,
            denialReason: 'By Admin Request Ticket No 946',
          },
        );



    // const createdWalletTrx = await walletService.createRawWalletTransaction(
    //     {
    //       user: transaction.user,
    //       wallet: fromWallet,
    //       trxType: TrxType.REIMBERS,
    //       amount: transaction.amount,
    //       transactionFlow: TransactionFlow.IN,
    //       note: `Using Script Total Amount Reimbers ${transaction.total} = commission ${transaction.commission} = Total Ammount ${transaction.amount}`,
    //     },
    //   );

    

    // Save the element after updating
    // await element.save();
  }

  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
