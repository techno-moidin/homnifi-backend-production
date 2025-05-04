import { User } from '@/src/users/schemas/user.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { TBalanceUserProductStatus } from '../enums/t-product.enums';
import { TBalanceProduct } from './t-balanceProduct.schema';
import { ProductPurchaseUserDetailHistory } from './t-balanceProductPurchaseUserDetailHistory.schema';

@Schema({ timestamps: true, versionKey: false })
export class TBalanceUserProduct extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name })
  user: mongoose.Types.ObjectId;

  @Prop({
    required: true,
    type: String,
  })
  bId: string;

  @Prop({
    required: true,
    type: String,
  })
  productUniqueId: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: TBalanceProduct.name })
  tProduct: mongoose.Types.ObjectId;

  @Prop({
    required: true,
    type: Number,
  })
  productPrice: number; // in dollars

  @Prop({
    required: true,
    type: Number,
  })
  productReturnAmount: number; // in dollars

  @Prop({
    enum: TBalanceUserProductStatus,
    required: true,
    default: TBalanceUserProductStatus.IN_PROCESS,
  })
  status: TBalanceUserProductStatus;

  @Prop({
    required: true,
    type: Number,
  })
  previousBalance: number;

  @Prop({
    required: true,
    type: Number,
  })
  newBalance: number;

  @Prop({ default: null, type: Date })
  purchasedDate: Date;

  @Prop({ default: null, type: Date })
  processedDate: Date;

  @Prop({ default: null, type: Date })
  lastEditDate: Date;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: ProductPurchaseUserDetailHistory.name,
  })
  lastEditId: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.Mixed, default: null, required: false })
  meta?: Record<string, any>;

  @Prop({ default: null, type: Date })
  deletedAt: Date;
}

export const TBalanceUserProductSchema =
  SchemaFactory.createForClass(TBalanceUserProduct);
