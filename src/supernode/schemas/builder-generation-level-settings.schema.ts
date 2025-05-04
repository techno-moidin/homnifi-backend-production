import { Admin } from '@/src/admin/schemas/admin.schema';
import { CloudKProduct } from '@/src/cloud-k/schemas/cloudk-products.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { BuilderGenerationSetting } from './builder-generation-settings';

@Schema({ timestamps: true, versionKey: false })
export class BuilderGenerationLevelSetting extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: CloudKProduct.name })
  product: mongoose.Types.ObjectId;

  @Prop({ required: true, type: Number })
  percentage: number;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: BuilderGenerationSetting.name,
  })
  setting: mongoose.Types.ObjectId;

  @Prop({ required: true, type: Boolean })
  isActive: boolean;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Admin.name })
  admin: mongoose.Types.ObjectId;

  @Prop({ default: null, type: Date })
  deletedAt: Date;
}

export const BuilderGenerationLevelSettingSchema = SchemaFactory.createForClass(
  BuilderGenerationLevelSetting,
);
