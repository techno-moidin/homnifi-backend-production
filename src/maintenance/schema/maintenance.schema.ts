import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum MAINTENANCE_DELETED_METHOD {
  ADMIN = 'ADMIN',
  SYSTEM = 'SYSTEM',
}

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
  },
  toObject: {
    virtuals: true,
  },
})
export class MainTenance extends Document {
  @Prop({
    type: Date,
  })
  startDateTime: Date;

  @Prop({
    type: Date,
  })
  endDateTime: Date;

  @Prop({
    type: String,
  })
  reason: string; // this is the reason to be displayed in platform side

  @Prop({
    type: String,
  })
  note: string; // this note for admin side

  @Prop({
    default: false,
    type: Boolean,
  })
  coundownShow: boolean;

  @Prop({
    default: false,
    type: Boolean,
  })
  apiWorking: boolean;

  @Prop({
    default: false,
    type: Boolean,
  })
  webhookWorking: boolean;

  @Prop({
    default: false,
    type: Boolean,
  })
  cronJobWorking: boolean;

  @Prop({
    default: false,
    type: Boolean,
  })
  autoLogoutWorking: boolean;

  @Prop({
    default: false,
    type: Boolean,
  })
  otherWorking: boolean;

  @Prop({ default: null, type: Date })
  solvedAt: Date;

  @Prop({
    enum: MAINTENANCE_DELETED_METHOD,
    default: null,
    type: String,
  })
  solvedMethod: string;
}

export const MainTenanceSchema = SchemaFactory.createForClass(MainTenance);
