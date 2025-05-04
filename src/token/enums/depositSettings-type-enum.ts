import { Types } from 'mongoose';

export enum DepositSettingsType {
  DEPOSIT_AND_KEEP = 'deposit-and-keep',
  DEPOSIT_AND_STAKE = 'deposit-and-stake',
}

export type setDepositSummaryType = {
  amount: number;
  token: Types.ObjectId;
  tokenSymbol: string;
  network: Types.ObjectId;
  networkName: string;
};
