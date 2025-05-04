import { transformToLowerCase } from '@/src/utils/helpers';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';
 export class ClaimRewardsDto {
  @Transform(transformToLowerCase)
  @IsString()
  @IsNotEmpty()
  token: string;

  @Min(0)
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsNotEmpty()
  bid: string;
}
