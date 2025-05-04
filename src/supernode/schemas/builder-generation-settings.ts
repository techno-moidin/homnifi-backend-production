import { Admin } from '@/src/admin/schemas/admin.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class BuilderGenerationSetting extends Document {
  @Prop({ type: String })
  note: string;

  @Prop({ required: true, type: Boolean })
  isActive: boolean;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Admin.name })
  admin: mongoose.Types.ObjectId;

  @Prop({ required: true, type: Number })
  matchingBonus: number;

  @Prop({ default: null, type: Date })
  deletedAt: Date;
}

export const BuilderGenerationSettingSchema = SchemaFactory.createForClass(
  BuilderGenerationSetting,
);
