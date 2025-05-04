import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CloudKRewardService } from '../cloud-k/cloudk-reward.service';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  // const baseReferralRewardService = appContext.get(BaseReferralRewardService);
  const cloudKRewardService = appContext.get(CloudKRewardService)
  await cloudKRewardService.generateSuperNodeReward()
  console.info('Good Job, All done!');
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
