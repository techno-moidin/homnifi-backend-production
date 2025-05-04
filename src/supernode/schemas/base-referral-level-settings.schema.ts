export class Supernode {}
import { User } from '@/src/users/schemas/user.schema';
import { TransactionFlow } from '@/src/wallet/enums/transcation.flow.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseReferralSetting } from './base-referral-setting.schema';

@Schema({ timestamps: true, versionKey: false })
export class BaseReferralLevelSetting extends Document {
  @Prop({ type: Types.ObjectId, ref: BaseReferralSetting.name, required: true })
  setting: BaseReferralSetting;

  @Prop({ required: true })
  firstLevelNodes: number;

  @Prop({ required: true })
  level: number;

  @Prop({ required: true })
  percentage: number;
}

export const BaseReferralLevelSchema = SchemaFactory.createForClass(
  BaseReferralLevelSetting,
);
