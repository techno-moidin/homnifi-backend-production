import {
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { MemberShipSubscriptionType } from '@/src/users/schemas/user.schema';

export class CheckMembershipDto {
  @IsNotEmpty()
  @IsString()
  bid: string;

  @IsNotEmpty()
  @IsDateString()
  expireDate: string;

  @IsNotEmpty()
  @IsEnum(MemberShipSubscriptionType)
  subscription_type: MemberShipSubscriptionType;
}
