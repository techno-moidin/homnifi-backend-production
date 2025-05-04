import {
  CONVERSION_TYPES,
  PLATFORMS,
  TOKEN_TYPES,
  TOKEN_WITHDRAW_TYPES,
} from '@/src/global/enums/wallet.enum';
import { Types } from 'mongoose';

export interface TokenI {
  readonly _id: Types.ObjectId;
  readonly name: string;
  readonly symbol: string;
  readonly type: TOKEN_TYPES;
  readonly withdrawType: TOKEN_WITHDRAW_TYPES;
  readonly color: string;
  readonly networks: Types.ObjectId[];
  readonly iconUrl: string;
  readonly createdBy: Types.ObjectId;
  readonly updatedBy: Types.ObjectId;
  readonly updatedAt: Date;
  readonly valueType: string;
  readonly platforms?: PLATFORMS[];
  readonly isDebitEnable?: boolean;
  readonly conversionType: CONVERSION_TYPES;
  readonly customRate?: number;
  readonly pairValue?: string;
}

export enum StaticToken {
  DEBIT = 'debit',
  LYK = 'lyk',
  LYK_W = 'lyk-w',
}
