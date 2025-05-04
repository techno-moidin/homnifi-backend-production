import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Model, Types } from 'mongoose';

import { Network } from '../../token/schemas/network.schema';

import { Token } from '@/src/token/schemas/token.schema';

@Schema({ timestamps: true, versionKey: false })
@Schema({ timestamps: true, versionKey: false })
export class WithdrawSummary extends Document {
  @Prop({
    required: true,
    type: Number,
  })
  amount: number;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Token.name })
  token: Token;

  @Prop({ type: String })
  tokenName: string;

  @Prop({ type: String })
  symbol: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Network.name })
  networkId: Network;

  @Prop({ type: String })
  networkName: string;

  @Prop({ type: String })
  withdrawType: string;

  @Prop({ default: null })
  deletedAt?: Date;
}

export const WithdrawSummarySchema =
  SchemaFactory.createForClass(WithdrawSummary);
