import { Admin } from '@/src/admin/schemas/admin.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class CloudKInflation extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Admin.name })
  addedBy: mongoose.Types.ObjectId;

  @Prop({ type: String, required: true })
  adminNote: string;

  @Prop({ type: String, required: true })
  name: string;
}

export const CloudKInflationSchema =
  SchemaFactory.createForClass(CloudKInflation);
