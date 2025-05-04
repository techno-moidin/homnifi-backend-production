import { AmountType } from '@/src/global/enums/amount.type.enum';
import { setDecimalPlaces } from '@/src/utils/helpers';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class CloudKAutoCompoundPenalty extends Document {
  @Prop({
    required: true,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.DOLLAR),
  })
  percentage: number;
}

export const CloudKAutoCompoundPenaltySchema = SchemaFactory.createForClass(
  CloudKAutoCompoundPenalty,
);
