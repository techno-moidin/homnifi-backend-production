import { Token } from '@/src/token/schemas/token.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class CloudKSetting extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Token.name })
  rewardToken: Token;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Token.name })
  stakeToken: Token;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Token.name })
  burnReceiveToken: Token; // it comes from the horismall side

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Token.name })
  burnInToken: Token;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Token.name })
  usdkStakeToken: Token;
}

export const CloudKSettingSchema = SchemaFactory.createForClass(CloudKSetting);
