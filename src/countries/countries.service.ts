import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCountryDto } from './dtos/create-country.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { countriesAllOptions, Country } from './schemas/country.schema';
import { UpdateCountryDto } from '@/src/countries/dtos/update-country.dto';

@Injectable()
export class CountriesService {
  constructor(
    @InjectModel(Country.name) private readonly countriesModel: Model<Country>,
  ) {}

  async createCountries(countries: CreateCountryDto[]) {
    const results = await this.countriesModel.create(countries, {
      aggregateErrors: true,
    });
    const errors = results.filter((value) => value instanceof Error);
    if (errors.length > 0) throw new AggregateError(errors);
    return results;
  }

  async updateCountryByCountryCode(
    countryCode: string,
    update: UpdateCountryDto,
  ) {
    if (typeof countryCode !== 'string')
      throw new Error('Invalid country code');
    const updated = await this.countriesModel.findOneAndUpdate(
      { countryCode },
      update,
    );
    if (!updated)
      throw new NotFoundException(`Country with code ${countryCode} not found`);
    return updated;
  }

  async getAllCountries() {
    return this.countriesModel.find();
  }

  async getAllCountriesOptions() {
    const countries = await this.countriesModel.find().lean();

    const formattedCountries = countries.map((country) => ({
      name: country.countryCode ?? null,
      label: country.name ?? null,
      value: country._id ?? null,
      flag: country.flag ?? null,
      countryCodeAlpha3: country.countryCodeAlpha3 ?? null,
    }));

    return [
      {
        name: countriesAllOptions.All,
        label: countriesAllOptions.All,
        value: countriesAllOptions.All,
        countryCodeAlpha3: countriesAllOptions.All,
        flag: null,
      },
      ...formattedCountries,
    ];
  }

  async deleteCountriesByCode(names: string[]): Promise<any> {
    return await this.countriesModel.deleteMany({
      countryCode: { $in: names },
    });
  }
}
