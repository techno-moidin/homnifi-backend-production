import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';
import { SUPPORT_STATUS } from '../schemas/support.schema';

export class CreateSupportDto {
  @IsString()
  name: string;

  @IsString()
  link: string;

  @IsString()
  logo: string;

  @IsString()
  icon: string;

  @IsString()
  background: string;

  @IsNumber()
  ordinator: number;

  @IsOptional()
  @IsEnum(SUPPORT_STATUS)
  status: SUPPORT_STATUS;
}
