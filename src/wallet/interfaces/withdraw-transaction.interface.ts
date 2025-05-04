import { User } from '../../users/schemas/user.schema';
import { Wallet } from '../schemas/wallet.schema';
import { WalletTransaction } from '../schemas/wallet.transaction.schema.';
import { Network } from '../../token/schemas/network.schema';
import { ChargesType } from '../../global/enums/charges.type.enum';
import { ProcessType } from '../../global/enums/process.enum';
import {
  DueRemarks,
  DueType,
  RequestStatus,
} from '../enums/request.status.enum';
import { Admin } from '@/src/admin/schemas/admin.schema';
import { ClientSession, Types } from 'mongoose';
import { TrxType } from '@/src/global/enums/trx.type.enum';

export class WithdrawTransactionI extends Document {
  readonly _id: Types.ObjectId;
  readonly serialNumber: number;
  readonly requestId: string;
  readonly user: Types.ObjectId;
  readonly fromWallet: Types.ObjectId;
  readonly fromWalletTrx: WalletTransaction;
  readonly network: Types.ObjectId;
  readonly receiverAddress: string;
  readonly amount: number;
  readonly total: number;
  readonly fee: number;
  readonly feeType: ChargesType;
  readonly charges: number;
  readonly chargesType: ChargesType;
  readonly processType: ProcessType;
  readonly userRemarks: string;
  readonly requestStatus: RequestStatus;
  readonly updatedBy: Types.ObjectId;
  readonly denialReason: string;
  readonly hash: string;
}

export interface DueReferenceMetaData {
  fromAmount?: number;
  fromToken?: Types.ObjectId | null;
  fromWallet?: Types.ObjectId | null;
  fromWalletTrx?: Types.ObjectId | null;
  deductedAmount?: number;
  amount?: number;
  type?: DueType;
  DueRemark?: DueRemarks;
  tokenPrice?: number;
  duewalletId?: Types.ObjectId;
  dueWalletTransactionId?: Types.ObjectId | null;
  withdrawTransactionId?: Types.ObjectId | null;
  depositTransactionId?: Types.ObjectId | null;
  cloudkTransactionId?: Types.ObjectId | null;
  snBonusTransactionId?: Types.ObjectId | null;
  remark?: string;
  note?: string;
  isDeducted?: boolean;
  isReverted?: boolean;
  revertedWalletTransactionId?: Types.ObjectId | null;
}

export interface DeductDueProcessTypes {
  userId: Types.ObjectId;
  token: Types.ObjectId;
  fromAmount: number;
  amount: number;
  isDebitEnable: boolean;
  tokenPrice: number;
  dueType: DueType;
  trxType: TrxType;
  beforeWalletBalance: number;
  session?: ClientSession;
}
