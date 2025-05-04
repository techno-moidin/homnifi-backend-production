import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { boolean, string } from 'zod';
import { WalletSettingsType } from '../enums/wallet-settings-type.schema';

@Schema({
  timestamps: true,
  versionKey: false,
})
export class WalletSetting extends Document {
  @Prop({
    required: true,
    enum: WalletSettingsType,
    type: string,
  })
  type: string;

  @Prop({
    type: boolean,
    required: true,
    immutable: true,
    default: false,
  })
  enabled: boolean;

  @Prop({
    type: string,
  })
  buttonMessage: string;

  @Prop({
    type: string,
  })
  message: string;
}

export const WalletSettingSchema = SchemaFactory.createForClass(WalletSetting);
