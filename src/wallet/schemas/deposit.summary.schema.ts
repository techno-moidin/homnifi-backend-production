import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Model, Types } from 'mongoose';

import { Network } from '../../token/schemas/network.schema';

import { Token } from '@/src/token/schemas/token.schema';

@Schema({ timestamps: true, versionKey: false })
export class DepositTransactionSummary extends Document {
  @Prop({
    required: false,
    default: null,
    type: Number,
  })
  amount: number;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Token.name })
  token?: Token;

  @Prop({ type: String })
  tokenSymbol?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Network.name })
  network?: Network;

  @Prop({ type: String })
  networkName?: string;

  @Prop({ default: null })
  deletedAt?: Date;
}

export const DepositTransactionSummarySchema = SchemaFactory.createForClass(
  DepositTransactionSummary,
);
