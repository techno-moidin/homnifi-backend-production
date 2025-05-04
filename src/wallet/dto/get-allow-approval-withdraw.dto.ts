import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GetAllowApprovalWithdrawDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsOptional()
  hotwallettoken?: string;

  @IsString()
  @IsOptional()
  networkType?: string;
}
