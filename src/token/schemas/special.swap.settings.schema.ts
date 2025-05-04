import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { Token } from './token.schema';
import { Admin } from '@/src/admin/schemas/admin.schema';
import { Platform } from '@/src/platform/schemas/platform.schema';
import { Country } from '@/src/countries/schemas/country.schema';
import { ChargesType } from '@/src/global/enums/charges.type.enum';
import { IsArray } from 'class-validator';

@Schema({
  timestamps: true,
  versionKey: false,
})
export class SpecialSwapSetting extends Document {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Token.name,
    required: true,
    immutable: true,
  })
  fromToken: Token;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Token.name,
    required: true,
    immutable: true,
  })
  toToken: Token;

  @Prop({ required: false, type: Number, default: 0 })
  minAmount: number;

  @Prop({ required: false, type: Number, default: 0 })
  maxAmount: number;

  @Prop({ required: true, type: Number, default: 0 })
  commission: number;

  @Prop({
    enum: ChargesType,
    required: true,
  })
  commissionType: ChargesType;

  @Prop({
    required: true,
    type: Number,
    default: 1,
  })
  rate: number;

  @Prop({
    required: false,
    default: false,
    type: Boolean,
  })
  isMarketRateEnable: boolean;

  @Prop({
    required: true,
    type: Number,
    default: 10000,
  })
  refreshInterval: number;

  @Prop({
    type: [mongoose.Schema.Types.ObjectId],
    ref: Country.name,
    required: true,
    immutable: true,
  })
  @IsArray()
  countries: Country[];

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Admin.name })
  updatedBy: Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Platform.name,
    required: true,
  })
  platform: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true, type: Boolean, default: true })
  isEnable: boolean;

  @Prop({ type: String, default: 'active' })
  status: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date;
}

const SpecialSwapSettingSchema =
  SchemaFactory.createForClass(SpecialSwapSetting);

SpecialSwapSettingSchema.index({
  fromToken: 1,
  toToken: 1,
  isEnable: 1,
  countries: 1,
});

export { SpecialSwapSettingSchema };
