import { PartialType } from '@nestjs/mapped-types';
import { CreateFaqDto } from './create-faq.dto';
import { IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateFaqDto extends PartialType(CreateFaqDto) {}
