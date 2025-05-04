import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { CloudKMachine } from '../cloud-k/schemas/cloudk-machine.schema';
import { CloudKMachineStake } from '../cloud-k/schemas/cloudk-machine-stakes.schema';
import { UserGask } from '../supernode/schemas/user-gask.schema';
import { TransactionFlow } from '../wallet/enums/transcation.flow.enum';
import { SuperNodeGaskSetting } from '../supernode/schemas/sn-gask-setting.schema';
import { UsdkStakeSettings } from '../usdk-stake/schemas/usdkStakeSettings.schema';
import { Token } from '../token/schemas/token.schema';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);

  const usdkStakeSettingsModel = appContext.get<Model<UsdkStakeSettings>>(
    `${UsdkStakeSettings.name}Model`,
  );
  const tokenModel = appContext.get<Model<Token>>(`${Token.name}Model`);
  try {
    const selectedTokens = await tokenModel
      .find({
        deletedAt: null,
        symbol: { $in: ['usdkw', 'usdk'] },
      })
      .lean();
    const tokenIds = selectedTokens.map((d) => d._id);
    const newSetting = new usdkStakeSettingsModel({
      multipler: 2,
      rewardPercentage: 2,
      status: true,
      tokens: tokenIds,
      isVisible: true,
    });
    await newSetting.save();
    console.log('Setting created.');
    process.exit(1);
  } catch (error) {
    console.error('While creating', error);
    process.exit(1);
  }
}

bootstrap()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error during bootstrap:', err);
    process.exit(1);
  });
