import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class CloudKWalletTransactionDto {
  @IsNotEmpty()
  @IsString()
  tokenSymbol: string;

  @IsString()
  @IsNotEmpty()
  userBid: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;
}
