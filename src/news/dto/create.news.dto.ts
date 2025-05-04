import { IsInEnum } from '@/src/decorators/IsInEnum.decorator';
import { Type } from 'class-transformer';
import {
  IsString,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  IsDate,
  IsObject,
} from 'class-validator';
import { NewsShowsOn } from '../schemas/news.schema';
import { IsBooleanOnObject } from '@/src/decorators/IsBooleanOnObject.decorator';

export class CreateNewsDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsBoolean()
  @IsNotEmpty()
  isActive: boolean;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  startTime?: Date;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  endTime?: Date;

  @IsBoolean()
  @IsOptional()
  popupOnLogin?: boolean;

  @IsOptional()
  @IsObject()
  @IsBooleanOnObject()
  showsOn?: Record<NewsShowsOn, boolean>;
}
