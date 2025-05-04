import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { CloudKInflation } from './cloudk-inflation.schema';
import { setDecimalPlaces } from '@/src/utils/helpers';
import { AmountType } from '@/src/global/enums/amount.type.enum';

@Schema({ timestamps: true, versionKey: false })
export class CloudKInflationRules extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: CloudKInflation.name })
  inflation: mongoose.Types.ObjectId;

  @Prop({
    required: true,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.DOLLAR),
  })
  dropPercentage: number;

  @Prop({
    required: true,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.DOLLAR),
  })
  productionDecreasePercentage: number;

  @Prop({
    required: false,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.DOLLAR),
  })
  productionDecreaseUpdatePercentage: number;

  @Prop({
    required: false,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.DOLLAR),
  })
  increaseDLPPercentageUpdate: number;

  @Prop({
    required: true,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.DOLLAR),
  })
  increaseDLPPercentage: number;

  @Prop({
    required: true,
    type: Number,
  })
  mintingBoost: number;
}

export const CloudKInflationRulesSchema =
  SchemaFactory.createForClass(CloudKInflationRules);
