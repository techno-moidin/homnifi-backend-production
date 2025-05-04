import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { TBalanceUserProduct } from './t-balanceUserProduct.schema';
import { TBalanceProduct } from './t-balanceProduct.schema';
import { User } from '@/src/users/schemas/user.schema';

@Schema({ timestamps: true, versionKey: false })
export class ProductPurchaseUserDetailHistory extends Document {
  @Prop({
    required: true,
    type: String,
  })
  firstName: string;

  @Prop({
    required: true,
    type: String,
  })
  lastName: string;

  @Prop({
    required: true,
    type: String,
  })
  email: string;

  @Prop({
    required: true,
    type: Boolean,
    default: false,
  })
  status: boolean;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: TBalanceProduct.name })
  tProduct: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name })
  user: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.Mixed, default: null, required: false })
  meta?: Record<string, any>;

  @Prop({ default: null, type: Date })
  deletedAt: Date;
}

export const ProductPurchaseUserDetailHistorySchema =
  SchemaFactory.createForClass(ProductPurchaseUserDetailHistory);
