import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { AdditionalMintingPromotion } from './additional-minting-promotion.schema';
import { CountryChangeType } from './additional.product.minting.Schema';

export interface IInactiveAdditionalMintingCountryItem {
  countryId: Types.ObjectId | string;
  name: string;
  type?: CountryChangeType;
  countryCodeAlpha3: string;
  percentage: number;
  adminId: Types.ObjectId;
  changesMadeAt: Date;
}

@Schema({ timestamps: true, versionKey: false })
export class InactiveAdditionalCountryLevelSetting {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: AdditionalMintingPromotion.name,
    required: true,
  })
  additionalMintingProductId: Types.ObjectId;

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
  countryList: IInactiveAdditionalMintingCountryItem[];

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

export const InactiveAdditionalCountryLevelSettingSchema =
  SchemaFactory.createForClass(InactiveAdditionalCountryLevelSetting);
