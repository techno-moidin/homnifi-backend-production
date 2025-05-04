import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateWAlletTokenDto {
  @IsString()
  @IsNotEmpty()
  networks: string;
}
