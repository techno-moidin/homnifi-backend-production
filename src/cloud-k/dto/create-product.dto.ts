import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { IsObjectId } from 'class-validator-mongo-object-id';

export class CreateCloudKProductDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  url: string;

  @IsNotEmpty()
  @IsString()
  imageUrl: string;

  @IsNotEmpty()
  @IsString()
  externalProductId: string;

  // @IsNotEmpty()
  // @IsString()
  // skuId: string; (not in schema)

  @IsNotEmpty()
  @IsNumber()
  price: number; // in dollars

  // @IsNotEmpty()
  // @IsNumber()
  // mintingPower: number; // in percentage (not in schema)

  @IsNotEmpty()
  @IsNumber()
  stakeLimit: number;

  @IsNotEmpty()
  @IsNumber()
  mintingPowerPerc: number; // in percentage

  @IsNotEmpty()
  @IsBoolean()
  defiPortal: boolean;

  @IsNotEmpty()
  @IsNumber()
  airdropPromo: number; // in dollars

  // @IsNotEmpty()
  // @IsNumber()
  // tokenAirdrop: number; // in dollars (not in schema)

  @IsNotEmpty()
  @IsString()
  licenseName: string;

  @IsNotEmpty()
  @IsNumber()
  profitSplitFee: number;

  // @IsNotEmpty()
  // @IsBoolean()
  // aiTradingNews: boolean; (not in schema)

  // @IsOptional()
  // @IsNumber()
  // capping?: number | null; (not in schema)

  @IsNotEmpty()
  @IsString()
  aiTradingSoftwareName: string;

  @IsOptional()
  @IsNumber()
  superNodeLevel?: number;

  @IsOptional()
  @IsNumber()
  globalPool?: number;

  @IsOptional()
  @IsNumber()
  countryPoints?: number;

  @IsOptional()
  @IsNumber()
  bonus?: number;

  @IsOptional()
  @IsBoolean()
  stakeUnlimited?: boolean;

  @IsNotEmpty()
  @IsNumber()
  launchpadAirdrop: number;

  @IsOptional()
  @IsNumber()
  quantwiseCapping?: number;

  @IsOptional()
  @IsNumber()
  superNodeCapping?: number;

  @IsOptional()
  @IsBoolean()
  bestValue?: boolean;

  // @IsOptional()
  // @IsNumber()
  // genRewardPercentage?: number;
}

export class CreateCloudKProductGen2RewardPercentageDto {
  @IsNotEmpty()
  @IsObjectId()
  productId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01, { message: 'Percentage should be greater than 0' })
  @Max(100, { message: 'Percentage should be lesser than or equal to 100' })
  genRewardPercentage: number;
}
