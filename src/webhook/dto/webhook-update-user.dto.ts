import { IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { UpdateUserDto } from '@/src/users/dto/update-user.dto';

export class WebhookUpdateUserDto extends PartialType(UpdateUserDto) {
  @IsNotEmpty()
  @IsString()
  bid: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsBoolean()
  isMembership?: boolean;

  @IsOptional()
  @IsString()
  referralCode?: string;
}
