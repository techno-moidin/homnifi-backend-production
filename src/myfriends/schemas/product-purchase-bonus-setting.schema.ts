import { Token } from '@/src/token/schemas/token.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class MyFriendsProductPurhcaseBonusSetting extends Document {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Token.name,
    required: true,
  })
  rewardToken: Token;

  @Prop({ type: Number, required: true })
  percentage: number;
}

export const MyFriendsProductPurhcaseBonusSettingSchema =
  SchemaFactory.createForClass(MyFriendsProductPurhcaseBonusSetting);
