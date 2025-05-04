import { ChargesType } from '@/src/global/enums/charges.type.enum';
import { ProcessType } from '@/src/global/enums/process.enum';
import { TrxType } from '@/src/global/enums/trx.type.enum';

export class UpdateTrxSettingsDto {
  readonly trxType: TrxType;
  readonly fee: number;
  readonly feeType: ChargesType;
  readonly charges: number;
  readonly chargesType: ChargesType;
  readonly processType: ProcessType;
  readonly minAmount: number;
  readonly maxAmount: number;
}
