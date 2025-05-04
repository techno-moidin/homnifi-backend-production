import { Controller, Get } from '@nestjs/common';
import { CountriesService } from '@/src/countries/countries.service';
import ApiResponse from '@/src/utils/api-response.util';

@Controller('countries')
export class CountriesController {
  constructor(private countriesService: CountriesService) {}

  @Get()
  async getAllCountries() {
    const countries = await this.countriesService.getAllCountries();
    return new ApiResponse(countries, 'All countries fetched successfully');
  }
  @Get('options')
  async getAllCountriesOptions() {
    const countries = await this.countriesService.getAllCountriesOptions();
    return new ApiResponse(countries, 'All countries fetched successfully');
  }
}
