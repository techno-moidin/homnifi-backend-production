export class Supernode {}
import { User } from '@/src/users/schemas/user.schema';
import { TransactionFlow } from '@/src/wallet/enums/transcation.flow.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class TierSetting extends Document {
  @Prop({ type: String })
  note: string;

  @Prop({ required: true, type: Boolean })
  isActive: boolean;

  @Prop({ required: true, type: Number })
  totalLevels: number;

  @Prop({
    type: Date,
    default: null,
  })
  deletedAt: Date;

  @Prop({ type: mongoose.Schema.Types.Mixed, default: {} })
  meta: Record<string, any>;
}

export const TierSettingSchema = SchemaFactory.createForClass(TierSetting);
