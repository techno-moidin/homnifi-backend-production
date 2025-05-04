import { IsNotEmpty, IsString } from 'class-validator';

export class CreateNetworkDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}
