import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class UserTwoAccess extends Document {
  @Prop({
    type: String,
    default: null,
    unique: true,
    index: true,
  })
  bid: string;

  @Prop({ type: String, default: null })
  upline_id: string;

  @Prop({ type: String, default: null })
  username: string;

  @Prop({ type: String, default: null })
  email: string;

  @Prop({ type: String, default: null })
  first_name: string;

  @Prop({ type: String, default: null })
  last_name: string;

  @Prop({ type: String, default: null })
  blocked_at: string;

  @Prop({ type: String, default: null })
  blocked_by: string;

  @Prop({ type: String, default: null })
  blocked_reason: string;

  @Prop({ type: String, default: null })
  lfi_key: string;

  @Prop({ type: String, default: null })
  document_country: string;

  @Prop({ type: String, default: null })
  lic_number: string;

  @Prop({ type: String, default: null })
  membership_expiry: string;

  @Prop({ type: String, default: null })
  phone: string;

  @Prop({ type: String, default: null })
  referral_code: string;

  @Prop({ type: String, default: null })
  subscription_type: string;
}

export const UserTwoAccessSchema = SchemaFactory.createForClass(UserTwoAccess);
