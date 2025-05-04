import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const postgresConfig = (
  configService: ConfigService,
  dbKey?: string,
): TypeOrmModuleOptions | null => {
  return {
    type: 'postgres',
    host: dbKey
      ? configService.get(`${dbKey}_HOST`) // Use dbKey-specific variables for additional databases
      : configService.get('POSTGRES_HOST'), // Default to POSTGRES_* for the primary database
    port: dbKey
      ? configService.get<number>(`${dbKey}_PORT`)
      : configService.get<number>('POSTGRES_PORT'),
    username: dbKey
      ? configService.get(`${dbKey}_USER`)
      : configService.get('POSTGRES_USER'),
    password: dbKey
      ? configService.get(`${dbKey}_PASSWORD`)
      : configService.get('POSTGRES_PASSWORD'),
    database: dbKey
      ? configService.get(`${dbKey}_DB`)
      : configService.get('POSTGRES_DB'),
    synchronize: false,
  };
};
