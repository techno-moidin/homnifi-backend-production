import { Token } from '@/src/token/schemas/token.schema';
import { User } from '@/src/users/schemas/user.schema';
import { setDecimalPlaces } from '@/src/utils/helpers';
import { Wallet } from '@/src/wallet/schemas/wallet.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { CloudKProduct } from './cloudk-products.schema';
import { AmountType } from '@/src/global/enums/amount.type.enum';
import { CloudKMachine, CloudKMachineSchema } from './cloudk-machine.schema';
import { CloudKInflationRules } from './cloudk-inflation-rules.schema';
export enum CLOUDK_MACHINE_STATUS {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  TERMINATED = 'terminated',
  PAUSED = 'paused',
}

@Schema({ timestamps: true, versionKey: false })
export class CloudKSimulationMachine extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: CloudKProduct.name })
  product: mongoose.Types.ObjectId;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  imageUrl: string;

  @Prop({ type: Number, default: null, nullable: true })
  stakeLimit: number;

  @Prop({ type: Boolean, default: false })
  stakeUnlimited: boolean;

  @Prop({
    required: true,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.DOLLAR),
  })
  allTimeHigh: number;

  @Prop({
    required: true,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.DOLLAR),
  })
  dlp: number;

  @Prop({
    required: false,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.DOLLAR),
  })
  percentageFallFromToken?: number;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: CloudKInflationRules.name,
    required: false,
  })
  rule: mongoose.Types.ObjectId;

  @Prop({ required: true, type: Number })
  mintingPower: number;

  @Prop({ required: true, type: Number })
  boost: number;
}

export const CloudKSimulationMachineSchema = SchemaFactory.createForClass(
  CloudKSimulationMachine,
);
