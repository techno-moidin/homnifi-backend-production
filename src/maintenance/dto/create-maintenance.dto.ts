import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateMaintenanceDto {
  @IsNotEmpty()
  @IsOptional()
  @Transform(({ value }) => new Date(value), { toClassOnly: true })
  startDateTime: Date;

  @IsOptional()
  @Transform(({ value }) => new Date(value), { toClassOnly: true })
  endDateTime: Date;

  @IsNotEmpty()
  @IsString()
  reason: string; // this is the reason to be displayed in platform side

  @IsString()
  note: string; // this note for admin side

  @IsBoolean()
  @IsOptional()
  countdownShow: boolean;

  @IsBoolean()
  @IsOptional()
  apiWorking: boolean;

  @IsBoolean()
  @IsOptional()
  webhookWorking: boolean;

  @IsBoolean()
  @IsOptional()
  cronJobWorking: boolean;

  @IsBoolean()
  @IsOptional()
  autoLogoutWorking: boolean;

  @IsBoolean()
  @IsOptional()
  otherWorking: boolean;
}
