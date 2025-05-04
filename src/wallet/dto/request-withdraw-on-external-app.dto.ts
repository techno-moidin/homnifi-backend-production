import { TokenSymbol } from '@/src/token/enums/token-code.enum';
import { IsEnum, IsNumber, IsString } from 'class-validator';

export class RequestWithdrawOnExternalAppDto {
  @IsString()
  asset: string;

  @IsNumber()
  amount: number;

  @IsString()
  address: string;

  @IsString()
  requestId: string;
}
