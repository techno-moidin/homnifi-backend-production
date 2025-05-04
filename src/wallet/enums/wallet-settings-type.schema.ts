import { WITHDRAW_TYPES } from '@/src/token/enums/withdraw-types.enum';
import { Types } from 'mongoose';

export enum WalletSettingsType {
  SWAP = 'swap',
  WITHDRAW = 'withdraw',
}

export type WithdrawSummaryType = {
  amount: number;
  token: Types.ObjectId;
  tokenName?: string;
  symbol?: string;
  networkId: Types.ObjectId;
  networkName: string;
  withdrawType: WITHDRAW_TYPES;
};
