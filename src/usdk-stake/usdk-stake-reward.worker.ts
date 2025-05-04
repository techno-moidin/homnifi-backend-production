import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { parentPort, workerData } from 'worker_threads';
import { User } from '../users/schemas/user.schema';
import {
  CLOUDK_MACHINE_STATUS,
  CloudKMachine,
} from '../cloud-k/schemas/cloudk-machine.schema';
import { CloudKService } from '../cloud-k/cloud-k.service';
import { UsdkStakeRewardService } from './usdk-stake-reward.service';

const run = async () => {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const cloudKMachineModel = appContext.get<Model<CloudKMachine>>(
    CloudKMachine.name + 'Model',
  );
  const cloudkService = appContext.get(CloudKService);
  const usdkStakeRewardService = appContext.get(UsdkStakeRewardService);
  try {
    console.log('Script is started');

    const query = workerData;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const machines = await cloudKMachineModel
      .find({
        status: CLOUDK_MACHINE_STATUS.ACTIVE,
        deletedAt: null,
        usdkStakeperiodStartDate: { $lt: today },
        usdkStakeperiodEndDate: { $gte: new Date() },
        collatoral: { $gt: 0 },
      })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit);

    if (machines.length < 0) {
      console.log('Active machine are not found.');
      return;
    }
    // get current price
    const { price } = await cloudkService.getCurrentPrice();
    for (let index = 0; index < machines.length; index++) {
      const element = machines[index];
      await usdkStakeRewardService.generateUsdkReward(element, price);
    }

    process.exit(0);
  } catch (error) {
    console.log(error, 'error');
    parentPort?.postMessage(`error: ${error.message}`);
    process.exit(1);
  }
};

run();
