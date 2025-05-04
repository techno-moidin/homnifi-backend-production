// import { NestFactory } from '@nestjs/core';
// import { AppModule } from '../app.module';
// import { BuilderGenerationalRewardService } from '../supernode/builder-generation.service';
// import { UsersService } from '../users/users.service';
// import { CloudKService } from '../cloud-k/cloud-k.service';
// import { CacheService } from '../cache/cache.service';
// import { Types } from 'mongoose';
// import { CloudKRewardService } from '../cloud-k/cloudk-reward.service';

// async function bootstrap() {
//   const appContext = await NestFactory.createApplicationContext(AppModule);

//   const cloudKRewardService = appContext.get(CloudKRewardService);
//   const cloudkService = appContext.get(CloudKService);
//   const cacheService = appContext.get(CacheService);
//   const dailyTokenValue =
//     await cloudKRewardService.getDailyReportOfTheTokenWhenStartRewardService();

//   const getMachineDetails = await cloudkService.getMachineDetails(
//     new Types.ObjectId('66b70119c1591e95a18f4440'),
//   );

//   const startDate = getMachineDetails.startDate;
//   const endDate = new Date();

//   process.exit(0);
// }

// bootstrap().catch((err) => {
//   console.error('Error populating database:', err);
//   process.exit(1);
// });
