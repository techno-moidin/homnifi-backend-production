import { IsNumber } from 'class-validator';

export class GlobalPoolResponseDto {
  @IsNumber()
  totalAmount: number;
}
