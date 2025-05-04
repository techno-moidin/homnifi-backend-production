import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { TierSetting } from './tier-setting.schema';

@Schema({ timestamps: true, versionKey: false })
export class TierLevelSetting extends Document {
  @Prop({ type: Types.ObjectId, ref: TierSetting.name, required: true })
  setting: TierSetting;

  @Prop({ required: true })
  from: number;

  @Prop({ required: true })
  to: number;

  @Prop({ required: true })
  amount: number;

  @Prop({
    type: Date,
    default: null,
  })
  deletedAt: Date;

  @Prop({ type: mongoose.Schema.Types.Mixed, default: {} })
  meta: Record<string, any>;
}

export const TierLevelSettingSchema =
  SchemaFactory.createForClass(TierLevelSetting);
