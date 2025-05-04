import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class TBalanceProduct extends Document {
  @Prop({
    required: true,
    type: String,
  })
  name: string;

  @Prop({
    required: true,
    type: Number,
  })
  levarage: number;

  @Prop({
    required: true,
    type: Number,
  })
  price: number; // in dollars

  @Prop({
    required: true,
    type: Number,
  })
  returnAmount: number; // in dollar

  @Prop({
    type: Boolean,
    default: false,
  })
  isVisible: boolean;

  @Prop({ type: mongoose.Schema.Types.Mixed, default: null, required: false })
  meta?: Record<string, any>;

  @Prop({ default: null, type: Date })
  deletedAt: Date;

  @Prop({ default: null, type: Date })
  lastEditDate: Date;
}

export const TBalanceProductSchema =
  SchemaFactory.createForClass(TBalanceProduct);
