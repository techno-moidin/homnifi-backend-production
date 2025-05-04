import { IsString } from 'class-validator';

export class UpdateUserEmailDto {
  @IsString()
  bid: string;

  @IsString()
  email: string;
}
