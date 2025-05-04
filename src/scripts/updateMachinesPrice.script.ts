import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { CloudKMachine } from '../cloud-k/schemas/cloudk-machine.schema';
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
import { AdminSupernodeService } from '../supernode/admin.supernode.service';

const baseReferralSettings = {
  note: '',
  levels: [
    {
      level: 1,
      percentage: 10,
      firstLevelNodes: 1,
    },
    {
      level: 2,
      percentage: 4,
      firstLevelNodes: 2,
    },
    {
      level: 3,
      percentage: 3,
      firstLevelNodes: 3,
    },
    {
      level: 4,
      percentage: 2,
      firstLevelNodes: 4,
    },
    {
      level: 5,
      percentage: 1,
      firstLevelNodes: 5,
    },
  ],
};

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const machineModel = appContext.get<Model<CloudKMachine>>(
    CloudKMachine.name + 'Model',
  );
  const machineStackeModel = appContext.get<Model<CloudKMachineStake>>(
    CloudKMachineStake.name + 'Model',
  );

  const cloudkService = appContext.get(CloudKService);
  const supernodeService = appContext.get(SupernodeService);

  const taskService = appContext.get(TasksService);

  const userGaskModel = appContext.get<Model<UserGask>>(
    UserGask.name + 'Model',
  );

  const snGaskSettingModel = appContext.get<Model<SuperNodeGaskSetting>>(
    SuperNodeGaskSetting.name + 'Model',
  );
  const snSettingModel = appContext.get<Model<SnSetting>>(
    SnSetting.name + 'Model',
  );
  const snGlobalPoolModel = appContext.get<Model<GlobalPool>>(
    GlobalPool.name + 'Model',
  );
  const tokenModel = appContext.get<Model<Token>>(Token.name + 'Model');
  const rewardToken = await tokenModel.findOne({ symbol: 'LYK-W' });

  await snSettingModel.create({ rewardToken: rewardToken._id });

  const snGasKSetting = await snGaskSettingModel.create({
    multiplier: 3,
  });

  const machineStakes = await machineStackeModel.find({
    totalPrice: { $gt: 0 },
  });

  // console.log(
  //   'Fetched stake data, total stakes count ->',
  //   machineStakes.length,
  // );

  for (const machineStake of machineStakes) {
    await userGaskModel.create({
      user: machineStake.user,
      amount: machineStake.totalPrice * snGasKSetting.multiplier,
      flow: TransactionFlow.IN,
    });
  }

  const machines: any = await machineModel
    .find({ $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }] })
    .populate('product');
  // console.log(
  //   'Updating machine collatoral, productPrice for base referral eligibility and sngp data',
  // );

  for (const machine of machines) {
    const newPrice = machine.product.price;
    const globalPool = machine.product.globalPool;
    const collatoral = await cloudkService.getMachineTotalCollatoral(
      machine._id,
    );

    if (newPrice) {
      machine.productPrice = newPrice;
      machine.collatoral = collatoral;
      await machine.save();
    }
    if (globalPool) {
      await snGlobalPoolModel.create({
        user: machine.user,
        amount: machine.product.globalPool,
        flow: TransactionFlow.IN,
      });
    }
  }

  const adminSupernodeService = appContext.get(AdminSupernodeService);
  await adminSupernodeService.createBaseReferralSetting(baseReferralSettings);
  await taskService.runUserImport();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error during bootstrap:', err);
  process.exit(1);
});
