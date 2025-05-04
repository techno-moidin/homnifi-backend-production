import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { CloudKMachine } from '@/src/cloud-k/schemas/cloudk-machine.schema';
import { DepositAndStakeTransaction } from './depositAndStakeTransaction';

@Schema({
  timestamps: true,
  versionKey: false,
})
export class DepositAndStakeProducts extends Document {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: DepositAndStakeTransaction.name,
    required: true,
  })
  depositAndStakeTransaction: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: CloudKMachine.name })
  machine: Types.ObjectId;

  @Prop({ type: Number, default: 0 })
  amount: number;

  @Prop({ type: Date, default: null })
  deletedAt: Date;
}

export const DepositAndStakeProductsSchema = SchemaFactory.createForClass(
  DepositAndStakeProducts,
);
