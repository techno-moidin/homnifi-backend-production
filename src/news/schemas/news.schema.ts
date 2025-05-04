import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NewsDocument = News & Document;

export enum NewsShowsOn {
  LOGIN = 'login',
  SUPERNODE = 'supernode',
}

@Schema({ timestamps: true, versionKey: false })
export class News {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true, type: String })
  body: string;

  @Prop({ required: true })
  isActive: boolean;

  @Prop({ type: Date })
  startTime?: Date;

  @Prop({ type: Date })
  endTime?: Date;

  @Prop({
    type: Map,
    of: Boolean,
  })
  popupOnLogin: boolean;

  @Prop({ type: Object })
  showsOn: Record<NewsShowsOn, boolean>;

  @Prop({ default: null, type: Date })
  deletedAt: Date;
}

export const NewsSchema = SchemaFactory.createForClass(News);
