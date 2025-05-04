import { IsString } from 'class-validator';

export class UpdateEmailUserDto {
  @IsString()
  email: string;
}
