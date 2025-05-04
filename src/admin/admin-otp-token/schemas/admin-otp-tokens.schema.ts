import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';
import { Admin } from '../../schemas/admin.schema';

export enum OTP_TOKEN_TYPES {
  EMAIL_VERIFICATION = 'email-verification',
  RESET_PASSWORD = 'reset-password',
  LOGIN_VERIFICATION = 'login-verification',
  TWO_FA_VERIFICATION = '2fa-verification',
}

@Schema({ timestamps: true, versionKey: false })
export class AdminOtpTokens {
  @Prop({ required: true, type: String })
  code: string;

  @Prop({ default: false, type: Boolean })
  isUsed: boolean;

  @Prop({
    type: String,
    enum: Object.values(OTP_TOKEN_TYPES),
    required: true,
  })
  type: string;

  @Prop({
    type: String,
    required: false,
  })
  token: string;

  @Prop({ type: Date, default: Date.now, expires: 86400 }) // expires in 5 minutes
  expiresAt: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Admin', required: true })
  admin: Admin;
}

export const AdminOtpTokensSchema =
  SchemaFactory.createForClass(AdminOtpTokens);
