import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CountriesService } from '@/src/countries/countries.service';
import axios from 'axios';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const countriesService = appContext.get(CountriesService);

  const response = await axios.get('https://restcountries.com/v3.1/all');
  const result = await response.data;
  await Promise.allSettled(
    result.map((entry) =>
      countriesService.updateCountryByCountryCode(entry.cca2, {
        countryCodeAlpha3: entry.cca3,
      }),
    ),
  ).then((promises) => {
    const errors = promises
      .map((promise) => promise.status === 'rejected' && promise.reason)
      .filter((e) => !!e);
    if (errors.length > 0) throw new AggregateError(errors);
  });

  ;
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
