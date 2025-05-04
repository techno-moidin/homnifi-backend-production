import { Admin } from '@/src/admin/schemas/admin.schema';
import { SchemasNamesEnum } from '@/src/global/enums/schemas.names.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { ObjectId, Types } from 'mongoose';
import { FAQModulesEnum } from '../enums/faq.modules';

@Schema({
  timestamps: true,
  versionKey: false,
  toJSON: {
    versionKey: false,
    transform(doc, ret, options) {
      delete ret.createdAt;
      delete ret.addedBy;
      delete ret.updatedAt;
      delete ret.updatedBy;
      delete ret.deletedAt;
      delete ret.deletedBy;
    },
  },
  toObject: {
    versionKey: false,
  },
})
export class FAQ {
  @Prop({ required: true })
  question: string;

  @Prop({ required: true })
  answer: string;

  @Prop({})
  videoUrl: string;

  @Prop({
    required: true,
    enum: FAQModulesEnum,
  })
  module: FAQModulesEnum;

  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: Admin.name,
  })
  addedBy: Admin;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Admin.name,
  })
  updatedBy: Admin;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Admin.name,
  })
  deletedBy: Admin;

  @Prop()
  deletedAt: Date;
}

export const FAQSchema = SchemaFactory.createForClass(FAQ);
