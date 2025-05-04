import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class AdminDeletePlatformDto {
  @IsNotEmpty()
  @IsMongoId()
  id: string;
}
