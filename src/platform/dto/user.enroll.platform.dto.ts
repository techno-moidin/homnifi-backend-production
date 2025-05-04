import { IsMongoId, IsNotEmpty } from 'class-validator';

export class UserEnrollPlatformDto {
  @IsMongoId()
  @IsNotEmpty()
  platform: string;
}
