import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { Token } from './token.schema';

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
export class Network extends Document {
  @Prop({ required: true, type: String })
  name: string;

  @Prop({ required: true, unique: true, type: String })
  code: string;

  @Prop({ default: null })
  deletedAt?: Date;
}

export const NetworkSchema = SchemaFactory.createForClass(Network);
