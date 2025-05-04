import { User } from '../../users/schemas/user.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Model, Types } from 'mongoose';

import { setDecimalPlaces } from '@/src/utils/helpers';

import { AmountType } from '@/src/global/enums/amount.type.enum';
import { WalletTransaction } from '@/src/wallet/schemas/wallet.transaction.schema.';
import { Wallet } from '@/src/wallet/schemas/wallet.schema';

export enum FreezeStatusTypes {
  COMPLETED = 'completed',
  PENDING = 'pending',
}

export enum FreezeTypes {
  FREEZE = 'freeze',
  UNFREEZE = 'unfreeze',
  WITHDRAW = 'withdrawn',
}
@Schema({ timestamps: true, versionKey: false })
export class WalletGatewayTransaction extends Document {
  @Prop({
    required: true,
    enum: FreezeTypes,
    type: String,
  })
  type: FreezeTypes;

  @Prop({ type: String })
  requestId: string; // Unique ID form the 3rd party

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
    required: true,
    immutable: true,
  })
  user: Types.ObjectId;

  @Prop({
    required: !1,
    immutable: true,
  })
  vendorName: string; // The name of the vendor who is sending the request: eg: Horismall

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Wallet.name,
    required: true,
    immutable: true,
  })
  wallet: Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: WalletTransaction.name,
    required: true,
    immutable: true,
  })
  walletTrxId: Types.ObjectId;

  @Prop({
    required: false,
  })
  productId: string;

  @Prop({
    required: true,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
  })
  amount: number;

  @Prop({ type: String, default: null })
  meta: string;

  @Prop({ type: Number, required: true })
  previousBalance: number;

  @Prop({ type: Number, required: true })
  newBalance: number;

  @Prop({
    required: true,
    type: String,
  })
  freezeTransactionId: string;
}

/**
 * The wallet gateway transaction schema.
 */
export const WalletGatewayTransactionSchema = SchemaFactory.createForClass(
  WalletGatewayTransaction,
);
