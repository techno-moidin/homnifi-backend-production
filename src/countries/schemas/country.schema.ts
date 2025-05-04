import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

type Currency = { name: string; symbol: string };

export enum countriesAllOptions {
  All = 'All',
}
@Schema({ timestamps: true, versionKey: false })
export class Country extends Document {
  @Prop({
    type: String,
    required: true,
  })
  countryCode: string;

  @Prop({
    type: String,
  })
  flag: string;

  @Prop({
    type: String,
    required: true,
  })
  name: string;

  @Prop({
    type: String,
    required: true,
  })
  region: string;

  @Prop({ type: [{ type: Map, of: { name: String, symbol: String } }] })
  currencies: Record<string, Currency>[];

  @Prop({
    type: String,
    default: 'active',
    required: true,
  })
  status: string;

  @Prop({
    type: [String],
  })
  phoneCodes: string[];

  @Prop({ type: Date, default: null })
  deletedAt: Date;

  @Prop({
    type: String,
    required: true,
  })
  countryCodeAlpha3: string;
}

const CountrySchema = SchemaFactory.createForClass(Country);

CountrySchema.index({ _id: -1, countryCode: -1, countryCodeAlpha3: -1 });

export { CountrySchema };
