import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { AdditionalMintingPromotion } from './additional-minting-promotion.schema';

export enum CountryChangeType {
  UPDATED = 'updated',
  REMOVED = 'removed',
}

export interface IAdditionalMintingCountryItem {
  countryId: Types.ObjectId | string;
  name: string;
  countryCodeAlpha3: string;
  percentage: number;
}

@Schema({ timestamps: true, versionKey: false })
export class AdditionalCountryLevelSetting {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: AdditionalMintingPromotion.name,
    required: true,
  })
  promotionId: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    required: true,
  })
  productId: Types.ObjectId;

  @Prop({ type: [] })
  countryList: IAdditionalMintingCountryItem[];

  @Prop({
    type: String,
    default: null,
    required: false,
  })
  note: string;

  @Prop({
    type: Date,
    default: null,
  })
  deletedAt: Date;
}

export const AdditionalCountryLevelSettingSchema = SchemaFactory.createForClass(
  AdditionalCountryLevelSetting,
);
