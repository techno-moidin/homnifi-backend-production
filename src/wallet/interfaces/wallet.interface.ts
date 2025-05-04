import { Types } from 'mongoose';
import { Token } from '../../token/schemas/token.schema';
import { User } from '../../users/schemas/user.schema';
import { TokenI } from '@/src/token/interfaces/token.interface';

export interface WalletI extends Document {
  readonly _id: Types.ObjectId;
  readonly user: Types.ObjectId;
  readonly token: Token;
  readonly externalTransaction: Types.ObjectId;
  readonly address: string;
  readonly note?: string;

}
