import { Token } from '@/src/token/schemas/token.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class UsdkStakeSettings extends Document {
  @Prop({
    required: true,
    type: Number,
  })
  multipler: number;

  @Prop({
    required: true,
    type: Number,
  })
  rewardPercentage: number;

  @Prop({
    required: false,
    ref: Token.name,
    type: [mongoose.SchemaTypes.ObjectId],
    default: [],
  })
  tokens: mongoose.Types.ObjectId[];

  @Prop({
    required: true,
    type: Boolean,
  })
  status: boolean;

  @Prop({
    required: false,
    type: Boolean,
    default: true,
  })
  isVisible: boolean;

  @Prop({ type: mongoose.Schema.Types.Mixed, default: null, required: false })
  meta?: Record<string, any>;

  @Prop({ default: null, type: Date })
  deletedAt: Date;
}

export const UsdkStakeSettingsSchema =
  SchemaFactory.createForClass(UsdkStakeSettings);
