import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

// this a dummy schema for temporary purposes

@Schema({ timestamps: true, versionKey: false })
export class UserMembership extends Document {
  @Prop({
    type: String,
    required: true,
  })
  userBid: string;

  @Prop({
    type: String,
    required: true,
  })
  userEmail: string;

  @Prop({
    type: Date,
    required: true,
  })
  expiredAt: Date;
}

export const UserMembershipSchema =
  SchemaFactory.createForClass(UserMembership);
