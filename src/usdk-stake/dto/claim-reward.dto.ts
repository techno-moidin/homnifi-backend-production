import { IsEnum, IsNotEmpty } from 'class-validator';

export enum ClaimType {
  USDK = 'usdk',
  LYK = 'lyk',
}
export class UsdkCliamRewardDto {
  // @IsNotEmpty()
  // machineId: string;

  @IsEnum(ClaimType)
  claimToken: 'usdk' | 'lyk';
}


export class UsdkCliamRewardByMachineDto {
  @IsNotEmpty()
  machineId: string;

  @IsEnum(ClaimType)
  claimToken: 'usdk' | 'lyk';
}