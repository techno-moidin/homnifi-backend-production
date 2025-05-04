import { IsBoolean, IsArray, IsNumber, IsMongoId } from 'class-validator';

export class CloudKSimulationDto {
  @IsMongoId()
  machine: boolean;

  @IsArray()
  @IsNumber({}, { each: true })
  prices: number[];

  @IsNumber()
  collatoral: number;

  @IsBoolean()
  autoCompound: boolean;
}
