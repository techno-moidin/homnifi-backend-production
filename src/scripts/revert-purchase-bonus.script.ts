import { CloudKRewardService } from '../cloud-k/cloudk-reward.service';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { TasksService } from '../tasks/tasks.service';
import { WalletService } from '../wallet/wallet.service';
import { TrxType } from '../global/enums/trx.type.enum';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const walletService = appContext.get(WalletService);

  // find all product purchase

  const allBonus = await walletService.walletTransactionModel.find({
    trxType: TrxType.BONUS,
  });

  ;

  // delete them
  for (const bonus of allBonus) {
    const deleted = await walletService.depositTransactionModel.deleteOne({
      toWalletTrx: bonus._id,
    });

    const deleted2 = await walletService.walletTransactionModel.deleteOne({
      _id: bonus._id,
    });

    // console.log({
    //   deleted,
    //   deleted2,
    //   bonus,
    // });
  }

  // delete them
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
