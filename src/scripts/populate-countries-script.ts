import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CountriesService } from '@/src/countries/countries.service';
import axios from 'axios';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const countriesService = appContext.get(CountriesService);

  const response = await axios.get('https://restcountries.com/v3.1/all');
  const result = await response.data;
  const countries = result.map((entry) => ({
    name: entry.name?.official,
    countryCode: entry.cca2,
    countryCodeAlpha3: entry.cca3,
    currencies: entry.currencies,
    flag: entry.flags?.png,
    region: entry.region,
    phoneCodes: entry.idd?.suffixes?.map(
      (suffix) => `${entry.idd?.root}${suffix}`,
    ),
  }));
  await countriesService.createCountries(countries).catch(async (e) => {
    if (!(e instanceof AggregateError)) {
      throw e;
    }
    const nonUniqueErrors = e.errors.filter((e) => e.code !== 11000);
    if (nonUniqueErrors.length > 0) throw new AggregateError(nonUniqueErrors);
    const names = e.errors.map((e) => e.keyValue?.countryCode);
    await countriesService.deleteCountriesByCode(names);
    const replacingCountries = countries.filter((value) =>
      names.includes(value.countryCode),
    );
    await countriesService.createCountries(replacingCountries);
  });

  
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
