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

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const machineModel = appContext.get<Model<CloudKMachine>>(
    CloudKMachine.name + 'Model',
  );
  const machineStackeModel = appContext.get<Model<CloudKMachineStake>>(
    CloudKMachineStake.name + 'Model',
  );

  const cloudkService = appContext.get(CloudKService);

  const tokenPrice: any = cloudkService.getCurrentPrice();

  const machines: any = await machineModel.find().populate('product');

  for (const machine of machines) {
    const tokenAmount = machine.product.airdropPromo / tokenPrice.price;
    const launchpadAirdrop =
      machine.product.launchpadAirdrop / tokenPrice.price;

    machine.airDrops = {
      airdropPromo: machine.product.airdropPromo,
      launchpadAirdrop: machine.product.launchpadAirdrop,
      airdropPromoTokenAmount: tokenAmount,
      launchpadAirdropTokenAmount: launchpadAirdrop,
    };
    machine.deletedAt = null;
    await machine.save();
  }

  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error during bootstrap:', err);
  process.exit(1);
});
