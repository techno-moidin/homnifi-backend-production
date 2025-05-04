import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { STATUS_TYPE } from '@/src/supernode/enums/sngp-type.enum';

export class AdminCreatePlatformDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  symbol: string;

  @IsNotEmpty()
  @IsEnum(STATUS_TYPE)
  status: STATUS_TYPE;
}
