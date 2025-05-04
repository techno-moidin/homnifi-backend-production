import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { OnChainWalletSetting } from '../../token/schemas/on.chain.wallet.setting.schema';

@Schema({ timestamps: true, versionKey: false })
export class OnChainAttempt extends Document {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: OnChainWalletSetting.name,
    required: true,
  })
  onChainWalletSetting: mongoose.Schema.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
    required: true,
    immutable: true,
  })
  user: mongoose.Schema.Types.ObjectId;

  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: Number, required: true, default: 0 })
  attempts: number;

  @Prop({ type: Boolean, default: false })
  isReset: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date;
}

export const OnChainAttemptSchema =
  SchemaFactory.createForClass(OnChainAttempt);
