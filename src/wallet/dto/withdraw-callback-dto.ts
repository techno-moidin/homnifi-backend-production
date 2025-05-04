import { IsEnum, IsOptional, IsString, IsDefined } from 'class-validator';
import { RequestStatus } from '../enums/request.status.enum';
import { ExternalAppRequestStatus } from '../enums/external-app-request-status.enum';

export class WithdrawCallbackDto {
  [key: string]: any; // to allow any other properties

  @IsString()
  @IsDefined()
  requestId: string;

  @IsEnum(ExternalAppRequestStatus)
  @IsDefined()
  status: ExternalAppRequestStatus;

  @IsString()
  @IsOptional()
  txHash?: string;
}
