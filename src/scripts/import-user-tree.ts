import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model, Types } from 'mongoose';
import { News } from '../news/schemas/news.schema';
import { CloudKReward } from '../cloud-k/schemas/cloudk-reward.schema';
import { BaseReferralRewardService } from '../supernode/base-referral-generate.service';
import { BuilderGenerationalRewardService } from '../supernode/builder-generation.service';
import { CloudKTransactions } from '../cloud-k/schemas/cloudk-transactions.schema';
import { CloudKRewardService } from '../cloud-k/cloudk-reward.service';
import { TasksService } from '../tasks/tasks.service';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const tasksService = appContext.get(TasksService);
  await tasksService.runUserImport();
  console.info('Good Job, All done!');
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
