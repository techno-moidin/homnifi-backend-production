import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { CloudKMachine } from '../cloud-k/schemas/cloudk-machine.schema';
import { CloudKMachineStake } from '../cloud-k/schemas/cloudk-machine-stakes.schema';
import { UserGask } from '../supernode/schemas/user-gask.schema';
import { TransactionFlow } from '../wallet/enums/transcation.flow.enum';
import { SuperNodeGaskSetting } from '../supernode/schemas/sn-gask-setting.schema';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);

  const machineModel = appContext.get<Model<CloudKMachine>>(
    `${CloudKMachine.name}Model`,
  );
  const machineStakeModel = appContext.get<Model<CloudKMachineStake>>(
    `${CloudKMachineStake.name}Model`,
  );
  const userGaskModel = appContext.get<Model<UserGask>>(
    `${UserGask.name}Model`,
  );
  const snGaskSettingModel = appContext.get<Model<SuperNodeGaskSetting>>(
    `${SuperNodeGaskSetting.name}Model`,
  );

  const [machines, snGaskSetting] = await Promise.all([
    machineModel.find({}).populate('product user').lean().exec(),
    snGaskSettingModel.findOne().lean().exec(),
  ]);

  await userGaskModel.deleteMany({});

  const multiplier = snGaskSetting?.multiplier || 3;

  const stakePromises = machines.map((machine) =>
    machineStakeModel
      .find({
        machine: machine._id,
        type: 'stake',
        deletedAt: { $eq: null },
      })
      .populate('user')
      .lean()
      .exec(),
  );

  const allStakes = await Promise.all(stakePromises);

  const newGasks = allStakes.flatMap((stakes, index) =>
    stakes.map((stake) => ({
      user: stake.user._id,
      machine: machines[index]._id,
      amount: stake.totalPrice * multiplier,
      stake: stake._id,
      flow: TransactionFlow.IN,
      multiplier: multiplier,
    })),
  );

  if (newGasks.length > 0) {
    await userGaskModel.insertMany(newGasks);
  }

  // console.log(
  //   `Processed ${machines.length} machines and created ${newGasks.length} new gasks.`,
  // );
}

bootstrap()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error during bootstrap:', err);
    process.exit(1);
  });
