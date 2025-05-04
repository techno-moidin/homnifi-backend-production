import { User } from '../../users/schemas/user.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { Wallet } from './wallet.schema';
import { TrxType } from '../../global/enums/trx.type.enum';
import { AmountType } from '../../global/enums/amount.type.enum';
import { TransactionFlow } from '../enums/transcation.flow.enum';
import { setDecimalPlaces } from '@/src/utils/helpers';
import { CloudKMachine } from '@/src/cloud-k/schemas/cloudk-machine.schema';

@Schema({
  timestamps: true,
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform(doc, ret, options) {
      delete ret._id;
      delete ret.createdAt;
      delete ret.updatedAt;
      delete ret.toWalletTrx;
      delete ret.externalTransactionId;
      delete ret.hash;
    },
  },
})
export class WalletTransaction extends Document {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
    required: true,
    immutable: true,
  })
  user: mongoose.Schema.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Wallet.name,
    required: true,
    immutable: true,
  })
  wallet: mongoose.Schema.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Wallet.name,
    required: false,
    immutable: true,
  })
  token: mongoose.Schema.Types.ObjectId;

  @Prop({
    required: true,
    immutable: true,
    enum: TrxType,
    type: String,
  })
  trxType: string;

  @Prop({
    required: true,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
  })
  amount: number;

  @Prop({
    type: Number,
  })
  actualAmount: number;

  @Prop({ required: true, enum: TransactionFlow, type: String })
  transactionFlow: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: CloudKMachine.name,
  })
  machine: CloudKMachine;

  @Prop({
    required: false,
    type: String,
  })
  note: string;

  @Prop({
    type: Object,
    required: false,
    default: null,
  })
  meta: object;

  @Prop({ default: null })
  deletedAt?: Date;
}

export const WalletTransactionSchema =
  SchemaFactory.createForClass(WalletTransaction);

WalletTransactionSchema.virtual('withdrawTransaction', {
  ref: 'WithdrawTransaction',
  localField: '_id',
  foreignField: 'fromWalletTrx',
  justOne: true,
});

WalletTransactionSchema.virtual('transferTransaction', {
  ref: 'TransferTransaction',
  localField: '_id',
  foreignField: 'fromWalletTrx',
  justOne: true,
});
