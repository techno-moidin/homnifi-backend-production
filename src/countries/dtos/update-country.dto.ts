import { PartialType } from '@nestjs/mapped-types';
import { CreateCountryDto } from '@/src/countries/dtos/create-country.dto';

export class UpdateCountryDto extends PartialType(CreateCountryDto) {}
