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
import { SNBonusTransaction } from '../supernode/schemas/sn-bonus-transaction.schema';
import { SN_BONUS_TYPE } from '../supernode/enums/sn-bonus-type.enum';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const snBonusModel = appContext.get<Model<SNBonusTransaction>>(
    SNBonusTransaction.name + 'Model',
  );
  const machineStackeModel = appContext.get<Model<CloudKMachineStake>>(
    CloudKMachineStake.name + 'Model',
  );

  const cloudkService = appContext.get(CloudKService);

  const bonusTrx: any = await snBonusModel.find({
    type: SN_BONUS_TYPE.BUILDER_REFERRAL,
  });

  for (const bonus of bonusTrx) {
    bonus.type = SN_BONUS_TYPE.BUILDER_GENERATIONAl;

    await bonus.save();
  }

  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error during bootstrap:', err);
  process.exit(1);
});
