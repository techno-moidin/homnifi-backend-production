import { IsMongoId, IsNotEmpty } from 'class-validator';

export class MarkNotificationReadDto {
  @IsMongoId()
  @IsNotEmpty()
  id: string;
}
