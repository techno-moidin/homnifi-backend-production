import { User } from '../../users/schemas/user.schema';
import { Wallet } from '../schemas/wallet.schema';
import { WalletTransaction } from '../schemas/wallet.transaction.schema.';
import { ChargesType } from '../../global/enums/charges.type.enum';
import { ProcessType } from '../../global/enums/process.enum';
import { RequestStatus } from '../enums/request.status.enum';
import { Types } from 'mongoose';
import { Admin } from '@/src/admin/schemas/admin.schema';

export class TransferTransactionI extends Document {
  readonly _id: Types.ObjectId;
  readonly serialNumber: number;
  readonly user: Types.ObjectId;
  readonly toUser: Types.ObjectId;
  readonly fromWallet: Types.ObjectId;
  readonly fromWalletTrx: Types.ObjectId;
  readonly amount: number;
  readonly fee: number;
  readonly feeType: ChargesType;
  readonly charges: number;
  readonly chargesType: ChargesType;
  readonly processType: ProcessType;
  readonly userRemarks: string;
  readonly requestStatus: RequestStatus;
  readonly updatedBy: Types.ObjectId;
  readonly denialReason: string;
}
