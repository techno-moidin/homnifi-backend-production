import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { Token } from './token.schema';
import { TrxType } from '../../global/enums/trx.type.enum';
import { ProcessType } from '../../global/enums/process.enum';
import { ChargesType } from '../../global/enums/charges.type.enum';

@Schema({ timestamps: true, versionKey: false })
export class CommunityTrxSetting extends Document {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Token.name,
    required: true,
    immutable: true,
  })
  token: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true, enum: TrxType, type: String })
  trxType: string;

  @Prop({ required: true, type: Number })
  fee: number;

  @Prop({ required: true, enum: ChargesType, type: String })
  feeType: string;

  @Prop({ required: true, type: Number })
  charges: number;

  @Prop({ required: true, enum: ChargesType, type: String })
  chargesType: string;

  @Prop({ required: true, type: Boolean, default: false })
  swapFromEnabled: boolean;

  @Prop({
    required: true,
    enum: ProcessType,
    default: ProcessType.MANUAL,
    type: String,
  })
  processType: string;

  @Prop({ required: true, type: Number, default: 10 })
  minAmount: number;

  @Prop({ required: true, type: Number })
  maxAmount: number;

  @Prop({ required: true, type: Date })
  effectiveFrom: Date;

  @Prop({ required: true, type: Date })
  effectiveTo: Date;
}

export const CommunityTrxSettingSchema =
  SchemaFactory.createForClass(CommunityTrxSetting);
