import { User } from '@/src/users/schemas/user.schema';
import { Types } from 'mongoose';
import { Wallet } from '../schemas/wallet.schema';
import { WalletTransaction } from '../schemas/wallet.transaction.schema.';
import { ChargesType } from '@/src/global/enums/charges.type.enum';

export interface SwapTransactionI {
  readonly serialNumber: number;
  readonly user: User;
  readonly fromWallet: Wallet;
  readonly toWallet: Wallet;
  readonly fromWalletTrx: WalletTransaction;
  readonly toWalletTrx: WalletTransaction;
  readonly amount: number;
  readonly total: number;
  readonly fee: number;
  readonly feeType: ChargesType;
  readonly charges: number;
  readonly chargesType: ChargesType;
  readonly tokenPrice: number;

}
