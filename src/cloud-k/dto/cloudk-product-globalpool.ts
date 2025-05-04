import {
    IsNumber,
    IsOptional,
  } from 'class-validator';
  
  export class updateCloudKGlobalPoolDto {
  @IsOptional()
  @IsNumber()
  globalPool?: number;
  }  