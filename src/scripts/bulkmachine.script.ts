import { CloudKRewardService } from '../cloud-k/cloudk-reward.service';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { CloudKMachine } from '../cloud-k/schemas/cloudk-machine.schema';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const machineModel = appContext.get<Model<CloudKMachine>>(
    CloudKMachine.name + 'Model',
  );
  const machine = await machineModel.findOne({});
  const jsonData = machine.toJSON();
  delete jsonData._id;

  const allMachines = [];
  let i = 0;
  while (i < 100000) {
    allMachines.push({
      ...jsonData,
      uniqueName: 'M0x10005b4q' + i,
    });
    i++;
  }

  await machineModel.create(allMachines);

  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
