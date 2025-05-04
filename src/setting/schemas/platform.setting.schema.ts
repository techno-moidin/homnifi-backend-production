import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SettingTypeEnum } from '../enums/setting-type-enum';
import { SettingCategoryEnum } from '../enums/setting-category-enum';
@Schema({ timestamps: true, versionKey: false })
export class PlatformSetting {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  value: string;

  @Prop()
  description: string;

  @Prop({ required: true, enum: SettingTypeEnum })
  type: SettingTypeEnum;

  @Prop([String])
  options: string[];

  @Prop({ required: true, enum: SettingCategoryEnum })
  category: SettingCategoryEnum;
}

export const PlatformSettingSchema =
  SchemaFactory.createForClass(PlatformSetting);
