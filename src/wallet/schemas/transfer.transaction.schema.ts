import { User } from '../../users/schemas/user.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Model } from 'mongoose';
import { Wallet } from './wallet.schema';
import { ChargesType } from '../../global/enums/charges.type.enum';
import { Network } from '../../token/schemas/network.schema';
import { ProcessType } from '../../global/enums/process.enum';
import { RequestStatus } from '../enums/request.status.enum';
import { WalletTransaction } from './wallet.transaction.schema.';
import { Admin } from '@/src/admin/schemas/admin.schema';
import { setDecimalPlaces } from '@/src/utils/helpers';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/src/app.module';
import { AmountType } from '@/src/global/enums/amount.type.enum';

@Schema({ timestamps: true, versionKey: false })
export class TransferTransaction extends Document {
  @Prop({ unique: true, type: Number })
  serialNumber: number;

  @Prop({ unique: true, type: String })
  requestId: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
    required: true,
    immutable: true,
  })
  user: mongoose.Schema.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
    required: true,
    immutable: true,
  })
  toUser: mongoose.Schema.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Wallet.name,
    required: true,
    immutable: true,
  })
  fromWallet: mongoose.Schema.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: WalletTransaction.name,
    required: true,
    immutable: true,
  })
  fromWalletTrx: mongoose.Schema.Types.ObjectId;

  @Prop({
    required: true,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
  })
  amount: number;

  @Prop({
    required: true,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
  })
  total: number;

  @Prop({
    required: true,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
  })
  fee: number;

  @Prop({ required: true, enum: ChargesType, type: String })
  feeType: string;

  @Prop({
    required: true,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
  })
  charges: number;

  @Prop({ required: true, enum: ChargesType, type: String })
  chargesType: string;

  @Prop({ required: true, enum: ProcessType, type: String })
  processType: string;

  @Prop({ type: String })
  userRemarks: string;
  @Prop({
    required: true,
    enum: RequestStatus,
    type: String,
    default: RequestStatus.PENDING,
  })
  requestStatus: RequestStatus;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Admin.name,
  })
  updatedBy: mongoose.Schema.Types.ObjectId;

  @Prop({ type: String })
  denialReason: string;

  @Prop({ default: null })
  deletedAt?: Date;
}

export const TransferTransactionSchema =
  SchemaFactory.createForClass(TransferTransaction);
