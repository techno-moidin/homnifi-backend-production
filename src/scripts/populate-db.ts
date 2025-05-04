import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { seedTokens } from './tokens.seeder';
import { seedNetworks } from './network.seeder';
import { runUserScript } from './runSuperAdminScriptV2';
import { seedCloudKData } from './cloudk.seeder';
import SuperAdminSeeder from './super-admin';
import { seedSupports } from './support.seeder';
import { seedTrxSettings } from './trx-settings.seeder';
import { platformSettingsTokens } from './platform-settings.seeder';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);

  await seedNetworks(appContext);
  await seedTokens(appContext);
  // await seedTrxSettings(appContext); // not needed, can be done from admin panel
  await seedCloudKData(appContext);
  await seedSupports(appContext);
  await platformSettingsTokens(appContext);
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
