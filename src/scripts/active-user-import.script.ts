import { CloudKRewardService } from '../cloud-k/cloudk-reward.service';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { TasksService } from '../tasks/tasks.service';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const taskService = appContext.get(TasksService);
  await taskService.runUserImport();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
