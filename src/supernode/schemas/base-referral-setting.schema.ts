export class Supernode {}
import { User } from '@/src/users/schemas/user.schema';
import { TransactionFlow } from '@/src/wallet/enums/transcation.flow.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class BaseReferralSetting extends Document {
  @Prop({ type: String })
  note: string;

  @Prop({ required: true, type: Boolean })
  isActive: boolean;

  @Prop({ required: true, type: Number })
  totalLevels: number;

  @Prop({ default: null, type: Date })
  deletedAt: Date;
}

export const BaseReferralSettingSchema =
  SchemaFactory.createForClass(BaseReferralSetting);
