import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { ValidationPipe } from '@nestjs/common';
import { LoggingInterceptor } from './interceptor/logging.interceptor';
import mongoose from 'mongoose';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.useGlobalFilters(new AllExceptionsFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );
  const prod_Origins = [
    'https://app.homnifi.com',
    'https://hsewoikwusm55665sfftw009876.ent.to.homnifi.com',
  ];

  const qa_Origins = [
    'https://admin.homnifi.codeinprogress.net',
    'https://homnifi.codeinprogress.net',
    'http://localhost:3000',
    'http://localhost:3001',
    'https://christmas.homnifi.codeinprogress.net',
  ];

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 200,
  });
  await app.listen(configService.get('PORT'));
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
