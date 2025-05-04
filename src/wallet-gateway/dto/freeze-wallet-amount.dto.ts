import { transformToLowerCase } from '@/src/utils/helpers';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { IsObjectId } from 'class-validator-mongo-object-id';

class WalletAmountDto {
  @IsObjectId({ message: 'Wallet ID is not valid' })
  @IsNotEmpty()
  walletId: string;

  @IsNotEmpty()
  amount: number;
}

export class FreezeWalletAmountDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => WalletAmountDto)
  freezeData: WalletAmountDto[];

  @IsOptional()
  @IsString()
  meta: string;

  @IsNotEmpty()
  requestId: string;

  @IsString()
  platform?: string;
}
export class UnfreezeWalletAmountDto {
  @IsNotEmpty()
  @IsString()
  transactionRefId: string;
}

export class GetUserWalletDetailsDto {
  @IsNotEmpty()
  @IsString()
  bid: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'tokenSymbols array cannot be empty' })
  @IsNotEmpty({ each: true })
  @IsString({ each: true })
  @Transform(transformToLowerCase)
  tokenSymbols: string[];

  @IsString()
  platform?: string;
}
