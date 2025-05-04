import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class UserNews extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'News', required: true })
  newsId: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  read: boolean;
}

export const UserNewsSchema = SchemaFactory.createForClass(UserNews);
