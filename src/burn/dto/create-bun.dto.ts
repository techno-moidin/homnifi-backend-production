import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsDate, IsNumber } from 'class-validator';

export class CreateBunDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @Type(() => Date)
  @IsDate()
  startAt: Date;

  @Type(() => Date)
  @IsDate()
  expiresAt: Date;

  @IsNumber()
  @IsNotEmpty()
  normalPercentage: number;

  @IsNumber()
  @IsNotEmpty()
  boostPercentage: number;
}
