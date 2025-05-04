import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export enum PLATFORM_ADS_STATUS {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Schema({ timestamps: true, versionKey: false })
export class PlatformAds {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  imageUrl: string;

  @Prop()
  description: string;

  @Prop({
    type: String,
    enum: PLATFORM_ADS_STATUS,
    default: PLATFORM_ADS_STATUS.ACTIVE,
  })
  status: PLATFORM_ADS_STATUS;
}

export const PlatformAdsSchema = SchemaFactory.createForClass(PlatformAds);
