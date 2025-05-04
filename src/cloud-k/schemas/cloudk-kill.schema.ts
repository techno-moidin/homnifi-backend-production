import { Admin } from '@/src/admin/schemas/admin.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class CloudKKillSetting extends Document {
  @Prop({
    type: Boolean,
    required: true,
  })
  stakeEnabled: boolean;

  @Prop({
    type: Boolean,
    required: true,
  })
  claimEnabled: boolean;

  @Prop({
    type: Boolean,
    required: true,
  })
  machineBuyEnabled: boolean;

  @Prop({
    type: Boolean,
    required: true,
  })
  rewardsJobEnabled: boolean;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Admin.name,
  })
  addedBy: Admin;
}

export const CloudKKillSettingSchema =
  SchemaFactory.createForClass(CloudKKillSetting);
