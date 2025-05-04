import { TrxType } from '../../global/enums/trx.type.enum';
import { Types } from 'mongoose';
import { TransactionFlow } from '../enums/transcation.flow.enum';
import { WithdrawTransactionI } from './withdraw-transaction.interface';
import { TransferTransactionI } from './transfer-transaction.interface';
import { WalletI } from './wallet.interface';

export interface WalletTransactionI extends Document {
  readonly _id: Types.ObjectId;
  readonly user: Types.ObjectId;
  readonly token: Types.ObjectId;

  readonly wallet: WalletI;
  readonly trxType: TrxType;
  readonly amount: number;
  readonly note: string;
  readonly meta: object;
  readonly transactionFlow: TransactionFlow;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  withdrawTransaction: WithdrawTransactionI;
  transferTransaction: TransferTransactionI;
}
