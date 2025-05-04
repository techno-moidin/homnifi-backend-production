import { CloudKMachine } from '@/src/cloud-k/schemas/cloudk-machine.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export enum USER_TYPES {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export enum MemberShipSubscriptionType {
  DISTRIBUTOR = 'DISTRIBUTOR',
  CLIENT = 'CLIENT',
}

@Schema({ timestamps: true, versionKey: false })
export class User extends Document {
  @Prop({ type: String })
  email: string;

  @Prop({ type: String, unique: true, required: true, index: true })
  blockchainId: string;

  @Prop({ type: String, default: null })
  uplineBID: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name, default: null })
  uplineId?: mongoose.Types.ObjectId;

  @Prop({ type: String })
  username: string;

  @Prop({ type: String })
  firstName: string;

  @Prop({ type: String })
  lastName: string;

  @Prop({ type: Boolean, default: false })
  isBuilderGenerationActive: boolean;

  @Prop({ type: Boolean, default: false })
  isBaseReferralActive: boolean;

  @Prop({ type: String })
  profilePicture: string;

  @Prop({ type: Date })
  dateJoined: Date;

  @Prop({ type: Number })
  rewardMultiplier: number;

  @Prop({ type: Date })
  lastLogin: Date;

  @Prop({ type: Boolean, default: true })
  isBaseReferralEnabled: boolean;

  @Prop({ type: Boolean, default: true })
  isBuilderGenerationEnabled: boolean;

  @Prop({ type: Boolean, default: true })
  isBuilderReferralEnabled: boolean;

  @Prop({ type: Boolean, default: false })
  isUserEverPurchasedMachine: boolean;

  @Prop({ type: Boolean, default: false })
  trustpilotReviewed: boolean;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: CloudKMachine.name }],
    default: [],
  })
  products?: mongoose.Types.ObjectId[];

  @Prop({ type: Number, default: 0 })
  totalBuilderGenarational: number;

  @Prop({ type: Number, default: 0 })
  firstLineBuilderGenerational: number;

  @Prop({ type: Number, default: 0 })
  totalBaseReferral: number;

  @Prop({ type: Number, default: 0 })
  totalUserwithMembership: number;

  @Prop({ type: Number, default: 0 })
  totalUserwithoutMembership: number;

  @Prop({ type: Number, default: 0 })
  totalUserwithMachine: number;

  @Prop({ type: Number, default: 0 })
  totalUserwithoutMachine: number;

  @Prop({ type: Number, default: 0 })
  firstLineBaseReferral: number;

  @Prop({ type: Number, default: 0 })
  firstLineNode: number;

  @Prop({ type: Number, default: 0 })
  totalNode: number;

  @Prop({ type: Boolean, default: false })
  isMembership: boolean;

  @Prop({ type: Boolean, default: false })
  isBlocked: boolean;

  @Prop({ type: String, default: null })
  blockedReason: string;

  @Prop({ type: String, default: null })
  unblockedReason: string;

  @Prop({ type: String, default: null })
  blockedBy: string;

  @Prop({ type: String, default: null })
  unblockedBy: string;

  @Prop({ type: String, default: '' })
  referralCode: string;

  @Prop({
    type: Date,
    default: null,
  })
  membership_expiry: Date;

  @Prop({
    type: Number,
    default: 0,
  })
  depth: number;

  @Prop({ type: String, default: '' })
  path: string;

  @Prop({
    default: null,
    // enum: MemberShipSubscriptionType,
    type: String,
    required: false,
  })
  subscription_type?: string;

  @Prop({
    default: null,
    type: String,
    required: false,
  })
  document_country?: string;

  @Prop({ type: Boolean, default: false })
  isTomoConditionAccepted: boolean;
}

// Create Schema
export const UserSchema = SchemaFactory.createForClass(User);

// Add Virtual Field for `children`
UserSchema.virtual('children', {
  ref: User.name, // Referencing the same `User` model
  localField: '_id', // The field in this model
  foreignField: 'uplineId', // The field in the related model
});

// Enable Virtuals in JSON and Object Output
UserSchema.set('toObject', { virtuals: true });
UserSchema.set('toJSON', { virtuals: true });
