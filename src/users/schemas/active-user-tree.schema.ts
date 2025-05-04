export class Supernode {}
import { MembershipStatus } from '@/src/global/enums/Membership.status.enum';
import { User } from '@/src/users/schemas/user.schema';
import { TransactionFlow } from '@/src/wallet/enums/transcation.flow.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class ActiveUserTree extends Document {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  user: User;

  @Prop({ type: Types.ObjectId, ref: User.name })
  upline: User;

  @Prop({ type: Types.ObjectId, ref: User.name })
  membershipUpline: User;

  @Prop({
    type: String,
    default: null,
  })
  path: string;

  @Prop({
    type: String,
    default: null,
  })
  membershipPath: string;

  @Prop({ type: Date, default: null })
  membershipExpiry: Date;

  @Prop({
    type: String,
    enum: MembershipStatus,
    default: MembershipStatus.FALSE,
  })
  isMembership: MembershipStatus;

  @Prop({ type: Date, default: null })
  uplineMembershipExpiry: Date;

  @Prop({
    type: String,
    enum: MembershipStatus,
    default: MembershipStatus.FALSE,
  })
  isUplineMembership: MembershipStatus;

  @Prop({ type: Number, default: 0 })
  depthLevel: number;


  @Prop({
    default: null,
    type: Object,
  })
  meta: object;


  @Prop({ default: null, type: Date })
  deletedAt: Date;
}

export const ActiveUserTreeSchema =
  SchemaFactory.createForClass(ActiveUserTree);
