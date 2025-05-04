import { ChargesType } from '../../global/enums/charges.type.enum';
import { ProcessType } from '../../global/enums/process.enum';
import { TrxType } from '../../global/enums/trx.type.enum';
import { Types } from 'mongoose';

export interface TokenTrxSettingI {
  readonly _id: Types.ObjectId;
  readonly token: Types.ObjectId;
  readonly trxType: TrxType;
  readonly fee: number;
  readonly feeType: ChargesType;
  readonly charges: number;
  readonly chargesType: ChargesType;
  readonly processType: ProcessType;
  readonly minAmount: number;
  readonly maxAmount: number;
}
