import { Admin } from '@/src/admin/schemas/admin.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PlatformCategoryEnum } from '../enums/platform.category.enum';
import { STATUS_TYPE } from '@/src/supernode/enums/sngp-type.enum';

@Schema({
  timestamps: true,
  toJSON: {
    transform(doc, ret, options) {},
  },
  versionKey: false,
})
export class Platform extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, type: 'string', unique: true })
  symbol: string;

  @Prop({ required: true, enum: STATUS_TYPE, default: STATUS_TYPE.ACTIVE })
  status: string;

  @Prop({ default: null })
  deletedAt: Date;
}

export const PlatformSchema = SchemaFactory.createForClass(Platform);
