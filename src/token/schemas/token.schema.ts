import { Admin } from '@/src/admin/schemas/admin.schema';
import {
  CONVERSION_TYPES,
  PLATFORMS,
  TOKEN_TYPES,
  TOKEN_WITHDRAW_TYPES,
} from '@/src/global/enums/wallet.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { Network } from './network.schema';
import { IsOptional, IsString } from 'class-validator';

export enum ValueType {
  USD = 'usd',
  LYK = 'lyk',
  sLYK = 'slyk',
  mLYK = 'mlyk',
  LYKw = 'lyk-w',
}
export const DUE_WALLET_SYMBOL = 'due';

@Schema({
  timestamps: true,
  versionKey: false,
  toJSON: {
    versionKey: false,
    transform: function (doc, ret) {
      delete ret.__v;
      delete ret.createdAt;
      delete ret.updatedAt;
    },
  },
})
export class Token extends Document {
  @Prop({ unique: true, required: true })
  name: string; // display name

  @Prop({ unique: true, required: true, immutable: true })
  symbol: string;

  @Prop({ enum: TOKEN_TYPES, required: true })
  type: TOKEN_TYPES;

  @Prop({ enum: TOKEN_WITHDRAW_TYPES, required: true })
  withdrawType: TOKEN_WITHDRAW_TYPES;

  @Prop({ required: true })
  color: string;

  @Prop({ required: false })
  borderColor: string;

  /**
   * network and token will connect through the withdraw/deposit settings.
   * @deprecated since platform added
   */
  @Prop({ type: [mongoose.Schema.Types.ObjectId], ref: Network.name })
  networks?: Types.ObjectId[];

  @Prop({ required: true, type: String })
  iconUrl: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Admin.name,
  })
  createdBy: Admin;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Admin.name,
  })
  updatedBy: Admin;

  @Prop({ required: true, enum: ValueType })
  valueType?: ValueType;

  @Prop({ default: null })
  deletedAt?: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;

  /**
   * platforms and token will connect through the withdraw/deposit settings.
   * @deprecated since platform added
   */
  @Prop({
    type: [String],
    enum: PLATFORMS,
    required: false,
    default: [PLATFORMS.HOMNIFI],
  })
  platforms?: PLATFORMS[];

  @Prop({
    type: Boolean,
    required: false,
    default: false,
  })
  showZeroBalance: boolean;

  @Prop({
    type: Boolean,
    required: false,
    default: false,
  })
  isDebitEnable: boolean;

  @Prop({ enum: CONVERSION_TYPES, required: true })
  conversionType: CONVERSION_TYPES;

  @Prop({ required: false })
  customRate?: number;

  @Prop({ required: false })
  pairValue?: string;
}

export const TokenSchema = SchemaFactory.createForClass(Token);
