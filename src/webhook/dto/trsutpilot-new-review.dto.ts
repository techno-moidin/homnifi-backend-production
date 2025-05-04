import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsDateString,
} from 'class-validator';

export class TrustpilotNewReviewDto {
  @IsString()
  @IsNotEmpty()
  id: string; // Review ID

  @IsString()
  @IsNotEmpty()
  consumerId: string; // Consumer ID

  @IsString()
  @IsNotEmpty()
  businessUnitId: string; // Business Unit ID

  @IsString()
  @IsNotEmpty()
  reviewBody: string; // The content of the review

  @IsString()
  @IsNotEmpty()
  language: string; // Language of the review

  @IsDateString()
  @IsNotEmpty()
  createdAt: string; // When the review was created

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>; // Optional metadata

  @IsString()
  @IsOptional()
  referenceId?: string; // Optional reference ID

  @IsString()
  @IsOptional()
  starRating?: string; // Optional rating value
}
