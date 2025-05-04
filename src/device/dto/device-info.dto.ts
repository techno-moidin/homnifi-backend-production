import { IsOptional, IsString } from 'class-validator';

export class DeviceInfoDTO {
  @IsString()
  @IsOptional()
  deviceId: string;

  @IsString()
  @IsOptional()
  deviceName: string;

  @IsString()
  @IsOptional()
  ipAddress: string;

  @IsString()
  @IsOptional()
  location: any;
}
