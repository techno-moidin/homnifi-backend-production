import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum SUPPORT_STATUS {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Schema({ timestamps: true, versionKey: false })
export class Support extends Document {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  link: string;

  @Prop({ type: String, required: true })
  logo: string;

  @Prop({ type: String, required: true })
  icon: string;

  @Prop({ type: String, required: true })
  background: string;

  @Prop({ type: Number, required: true })
  ordinator: number;

  @Prop({
    default: SUPPORT_STATUS.ACTIVE,
    enum: SUPPORT_STATUS,
    type: String,
  })
  status: string;
}

export const SupportSchema = SchemaFactory.createForClass(Support);
