import { IsString, IsNotEmpty } from 'class-validator';

export class CloudKWalletBalanceDto {
  @IsNotEmpty()
  @IsString()
  tokenSymbol: string;

  @IsString()
  @IsNotEmpty()
  userBid: string;
}
