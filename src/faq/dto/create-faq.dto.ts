import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateFaqDto {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsString()
  @IsNotEmpty()
  answer: string;

  @IsOptional()
  // @IsUrl()
  videoUrl?: string = '';
}
