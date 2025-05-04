import { Token } from '@/src/token/schemas/token.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class SnSetting extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Token.name })
  rewardToken: Token;
}

export const SnSettingSchema = SchemaFactory.createForClass(SnSetting);
