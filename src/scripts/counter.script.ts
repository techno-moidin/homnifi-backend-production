import { CloudKRewardService } from '../cloud-k/cloudk-reward.service';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { CloudKMachine } from '../cloud-k/schemas/cloudk-machine.schema';
import { TrxCounter } from '../wallet/schemas/trx-counter.schema';
import { MachineCounter } from '../cloud-k/schemas/machine-counter.schema';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const trxCounterModel = appContext.get<Model<TrxCounter>>(
    TrxCounter.name + 'Model',
  );
  const machineCounterModel = appContext.get<Model<MachineCounter>>(
    MachineCounter.name + 'Model',
  );

  await machineCounterModel.findOneAndUpdate(
    { _id: 'machineSerialNumber' },
    { $inc: { seq: 1500 } },
    {
      new: true,
      upsert: true,
    },
  );

  await trxCounterModel.findOneAndUpdate(
    { _id: 'trxSerialNumber' },
    { $inc: { seq: 15000 } },
    {
      new: true,
      upsert: true,
    },
  );

  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
