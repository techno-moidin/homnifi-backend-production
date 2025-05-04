import { Admin } from '@/src/admin/schemas/admin.schema';
import { User } from '../../users/schemas/user.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';

export enum BURN_STATUS_TYPE {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  IN_ACTIVE = 'IN_ACTIVE',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true, versionKey: false })
export class Burn {
  @Prop({ required: true, type: String })
  name: string;

  @Prop({ required: true, type: String })
  phaseUniqueCode: string;

  @Prop({ type: Date, default: Date.now })
  startAt: Date;

  @Prop({ type: Date, default: Date.now })
  expiresAt: Date;

  @Prop({ type: Number, required: true })
  normalPercentage: number;

  @Prop({ type: Number, required: true })
  boostPercentage: number;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Admin.name,
    required: true,
  })
  admin: Types.ObjectId;

  @Prop({ enum: BURN_STATUS_TYPE, default: BURN_STATUS_TYPE.ACTIVE })
  status: BURN_STATUS_TYPE;

  @Prop({ default: null, type: Date })
  deletedAt: Date;
}

export const BurnSchema = SchemaFactory.createForClass(Burn);
