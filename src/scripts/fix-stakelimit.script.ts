import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import {
  CLOUDK_MACHINE_STATUS,
  CloudKMachine,
} from '../cloud-k/schemas/cloudk-machine.schema';
import { CloudKMachineStake } from '../cloud-k/schemas/cloudk-machine-stakes.schema';
import { UserGask } from '../supernode/schemas/user-gask.schema';
import { TransactionFlow } from '../wallet/enums/transcation.flow.enum';
import { SuperNodeGaskSetting } from '../supernode/schemas/sn-gask-setting.schema';
import { SnSetting } from '../supernode/schemas/sn-settings.schema';
import { Token } from '../token/schemas/token.schema';
import { GlobalPool } from '../supernode/schemas/sn-global-pool.schema';
import { CloudKService } from '../cloud-k/cloud-k.service';
import { SupernodeService } from '../supernode/supernode.service';
import { TasksService } from '../tasks/tasks.service';
import { CloudKReward } from '../cloud-k/schemas/cloudk-reward.schema';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const machineModel = appContext.get<Model<CloudKMachine>>(
    CloudKMachine.name + 'Model',
  );
  const machineStackeModel = appContext.get<Model<CloudKMachineStake>>(
    CloudKMachineStake.name + 'Model',
  );

  const userGaskModel = appContext.get<Model<UserGask>>(
    UserGask.name + 'Model',
  );
  const cloudKReward = appContext.get<Model<CloudKReward>>(
    CloudKReward.name + 'Model',
  );

  const machines: any = await machineModel
    .find({ stakeLimit: 0.16, externalMachineId: 'vm-100' })
    .populate('product');

  ;

  for (const machine of machines) {
    machine.collatoral = 0;
    machine.stakeLimit = 1000;
    machine.status = CLOUDK_MACHINE_STATUS.INACTIVE;

    await machine.save();

    const filterDate = new Date('2024-08-23T00:00:00Z'); // ISO 8601 format for the date

    const userGasks: any = await userGaskModel.find({
      user: machine.user,
      amount: 12,
      createdAt: { $gte: filterDate },
    });

    for (const userGask of userGasks) {
      userGask.amount = 0;
      await userGask.save();
    }

    // }
    const data = await cloudKReward.deleteMany({
      machine: machine._id,
    });
    ;
    ;
  }

  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error during bootstrap:', err);
  process.exit(1);
});
