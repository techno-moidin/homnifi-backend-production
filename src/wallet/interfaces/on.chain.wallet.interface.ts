import { Types } from 'mongoose';
import { Token } from '../../token/schemas/token.schema';
import { User } from '../../users/schemas/user.schema';
import { OnChainWallet } from '../schemas/on.chain.wallet.schema';

export interface OnChainWalletI extends Document {
  readonly _id: Types.ObjectId;
  readonly user: Types.ObjectId;
  readonly address: string;
  readonly network: Types.ObjectId;
  readonly token: Types.ObjectId;
  status?: string;
}
