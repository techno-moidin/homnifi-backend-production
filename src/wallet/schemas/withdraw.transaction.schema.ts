import { User } from '../../users/schemas/user.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Model, Types } from 'mongoose';
import { Wallet } from './wallet.schema';
import { WalletTransaction } from './wallet.transaction.schema.';
import { ChargesType } from '../../global/enums/charges.type.enum';
import { Network } from '../../token/schemas/network.schema';
import { ProcessType } from '../../global/enums/process.enum';
import { RequestStatus } from '../enums/request.status.enum';
import { Admin } from '@/src/admin/schemas/admin.schema';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/src/app.module';
import { setDecimalPlaces } from '@/src/utils/helpers';
import { WITHDRAW_TYPES } from '@/src/token/enums/withdraw-types.enum';
import { WithdrawSetting } from '@/src/token/schemas/withdraw.settings.schema';
import { AmountType } from '@/src/global/enums/amount.type.enum';
import { Platform } from '@/src/platform/schemas/platform.schema';
import { Token } from '@/src/token/schemas/token.schema';

@Schema({ timestamps: true, versionKey: false })
export class WithdrawTransaction extends Document {
  @Prop({ required: false, type: Number })
  serialNumber?: number;

  @Prop({ unique: true, type: String })
  requestId: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
    required: true,
    immutable: true,
  })
  user: Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Wallet.name,
    required: true,
    immutable: true,
  })
  fromWallet: Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: WalletTransaction.name,
    required: true,
    immutable: true,
  })
  fromWalletTrx: mongoose.Schema.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Token.name,
    default: null,
  })
  token: mongoose.Schema.Types.ObjectId;

  // Search Keys Start
  @Prop({
    type: String,
    unique: true,
    required: false,
    index: true,
    default: null,
  })
  blockchainId: string;

  // @Prop({
  //   type: String,
  //   default: null,
  // })
  // email: string;

  // @Prop({
  //   type: String,
  //   default: null,
  // })
  // firstName: string;

  // @Prop({
  //   type: String,
  //   default: null,
  // })
  // lastName: string;

  // Search Keys End

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Network.name,
  })
  network: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true, type: String })
  receiverAddress: string; // address or BId of another user

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
  commission: number;

  @Prop({ required: true, enum: ChargesType, type: String })
  commissionType: string;

  // @Prop({ required: true, enum: ProcessType, type: String })
  // processType: string;

  @Prop({ type: String })
  userRemarks: string;

  @Prop({ type: String, default: '', required: false })
  optionalRemarks: string;

  @Prop({
    required: true,
    enum: RequestStatus,
    default: RequestStatus.PENDING,
    type: String,
  })
  requestStatus: string;

  @Prop({
    required: true,
    enum: WITHDRAW_TYPES,
    type: String,
  })
  withdrawType: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Admin.name,
  })
  updatedBy: mongoose.Schema.Types.ObjectId;

  @Prop({ type: String })
  denialReason: string;

  @Prop({ type: String })
  hash: string;

  @Prop({ type: Number })
  tokenPrice: number;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Platform.name,
    default: '66fe6bff03dbab04d34935f0',
  })
  platform: mongoose.Schema.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: WithdrawSetting.name })
  settingsUsed: WithdrawSetting;

  @Prop({ type: Number })
  newBalance: number;

  @Prop({ type: Number })
  previousBalance: number;

  @Prop({ default: null })
  deletedAt?: Date;

  @Prop({
    type: String,
    default: null,
  })
  note: string;

  @Prop({
    default: null,
    required: false,
    type: Object,
  })
  meta: object;

  @Prop({
    required: false,
    default: null,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
  })
  metaAmount: number;

  @Prop({
    required: false,
    default: null,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
  })
  metaTotal: number;
}

export const WithdrawTransactionSchema =
  SchemaFactory.createForClass(WithdrawTransaction);
