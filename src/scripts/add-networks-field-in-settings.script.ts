import { NestFactory } from '@nestjs/core';
import { Model } from 'mongoose';
import { AppModule } from '../app.module';
import { DepositSetting } from '../token/schemas/deposit.settings.schema';
import { Token } from '../token/schemas/token.schema';
import { WithdrawSetting } from '../token/schemas/withdraw.settings.schema';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const TokenModel = appContext.get<Model<Token>>(Token.name + 'Model');

  const WithdrawSettingModel = appContext.get<Model<WithdrawSetting>>(
    WithdrawSetting.name + 'Model',
  );

  const DepositSettingModel = appContext.get<Model<DepositSetting>>(
    DepositSetting.name + 'Model',
  );

  const [withdrawSettings, DepositSettings, tokens] = await Promise.all([
    WithdrawSettingModel.find({
      deletedAt: null,
    }),
    DepositSettingModel.find({
      deletedAt: null,
    }),
    await TokenModel.find({ deletedAt: null }),
  ]);

  /**
   * I commented this because the schema of withdraw table has changed. following code can be worked out.
   */
  // console.log(
  //   'the schema of withdraw table has changed. following code can be worked out.',
  // );
  process.exit(0);

  // for (let token of tokens) {
  //   for (let setting of withdrawSettings) {
  //     if (setting.toToken.equals(token._id as any)) {
  //       ;
  //       setting.networks = token.networks;
  //       await setting.save();
  //     }
  //   }
  // }

  // for (let token of tokens) {
  //   for (let setting of DepositSettings) {
  //     if (setting.toToken.equals(token._id as any)) {
  //       ;
  //       setting.networks = token.networks;
  //       await setting.save();
  //     }
  //   }
  // }

  // for (let setting of DepositSettings) {
  //   tokens.map(async (token) => {
  //     if (setting.toToken == token._id) {
  //       setting.networks = token.networks;
  //       setting.save();
  //     }
  //   });
  // }

  ;
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
