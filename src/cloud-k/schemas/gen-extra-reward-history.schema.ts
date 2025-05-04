import { User } from '@/src/users/schemas/user.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { CloudKProduct } from './cloudk-products.schema';
import { Admin } from '@/src/admin/schemas/admin.schema';

@Schema({ timestamps: true, versionKey: false })
export class GenExtraRewardHistory extends Document {
  @Prop({ type: Number, required: true })
  percentage: number;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'cloudkproducts' })
  productId: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Admin.name })
  adminId: mongoose.Types.ObjectId;

  @Prop({
    required: true,
    type: Boolean,
    default: false,
  })
  status: boolean;
}

export const GenExtraRewardHistorySchema = SchemaFactory.createForClass(
  GenExtraRewardHistory,
);
