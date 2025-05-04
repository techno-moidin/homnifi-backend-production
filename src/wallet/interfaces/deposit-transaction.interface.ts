import { Types } from 'mongoose';

export interface DepositTransactionI {
  readonly _id: Types.ObjectId;
  readonly requestId: string;
  readonly serialNumber: number;
  readonly user: string;
  readonly toWallet: string;
  readonly toWalletTrx: string;
  readonly externalTransaction: string;
  readonly total: number;
  readonly transactionStatus: string;
  readonly confirmation: string;
  readonly hash: string;
  readonly note: string;
  readonly token: Types.ObjectId;
  readonly blockchainId: string;
  readonly claimableList: any;
  readonly remarks?: string;
  readonly optionalRemarks?: string;
  readonly meta?: object;
}
