import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { Token } from './token.schema';
import { Admin } from '@/src/admin/schemas/admin.schema';

@Schema({
  timestamps: true,
  versionKey: false,
  toJSON: {
    versionKey: false,
    transform: function (doc, ret) {
      delete ret.__v;
      delete ret.createdAt;
      delete ret.updatedAt;
    },
  },
})
export class TokenSetting extends Document {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Token.name,
    required: true,
    immutable: true,
  })
  token: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true, default: false, type: Boolean })
  withdrawEnabled: boolean;

  @Prop({ required: true, default: false, type: Boolean })
  depositEnabled: boolean;

  @Prop({ required: true, default: false, type: Boolean })
  swapEnabled: boolean;

  @Prop({ required: true, default: false, type: Boolean })
  specialSwapEnabled: boolean;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Admin.name })
  updatedBy: mongoose.Schema.Types.ObjectId;
}

export const TokenSettingSchema = SchemaFactory.createForClass(TokenSetting);
