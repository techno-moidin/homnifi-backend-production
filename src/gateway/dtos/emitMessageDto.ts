import { IsEnum, IsNotEmpty, IsObject, IsString } from 'class-validator';
import { IsObjectId } from 'class-validator-mongo-object-id';

export class EmitMessageDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsNotEmpty()
  @IsString()
  eventName: string;

  @IsObject()
  data: object;
}
