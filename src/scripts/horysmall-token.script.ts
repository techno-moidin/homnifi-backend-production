import { CloudKRewardService } from '../cloud-k/cloudk-reward.service';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { TasksService } from '../tasks/tasks.service';
import {
  PLATFORMS,
  TOKEN_TYPES,
  TOKEN_WITHDRAW_TYPES,
} from '../global/enums/wallet.enum';
import { Token } from '../token/schemas/token.schema';
import { Model } from 'mongoose';
import { TokenSetting } from '../token/schemas/token.setting.schema';
import { Network } from '../token/schemas/network.schema';
import { WithdrawSetting } from '../token/schemas/withdraw.settings.schema';
import { ChargesType } from '../global/enums/charges.type.enum';
import { WITHDRAW_TYPES } from '../token/enums/withdraw-types.enum';
import { Platform } from '../platform/schemas/platform.schema';

const USDK = 'USDK';
const USDK_PROMO = 'USDK-PROMO';
const USDK_VOUCHER = 'USDK-VOUCHER';
const USDK_W = 'USDK-W';
const CLFI_W = 'cLfi-W';

const tokensToSeed = [
  {
    name: 'USDK',
    symbol: USDK,
    type: TOKEN_TYPES.OFF_CHAIN,
    withdrawType: TOKEN_WITHDRAW_TYPES.OFF_CHAIN,
    color: '#2c2c2c',
    iconUrl:
      'https://seeklogo.com/images/U/usdk-usdk-logo-2ABC07CB51-seeklogo.com.png',
  },
  {
    name: 'USDK Promo',
    symbol: USDK_PROMO,
    type: TOKEN_TYPES.OFF_CHAIN,
    withdrawType: TOKEN_WITHDRAW_TYPES.OFF_CHAIN,
    color: '#2c2c2c',
    iconUrl:
      'https://seeklogo.com/images/U/usdk-usdk-logo-2ABC07CB51-seeklogo.com.png',
  },
  {
    name: 'USDK Voucher',
    symbol: USDK_VOUCHER,
    type: TOKEN_TYPES.OFF_CHAIN,
    withdrawType: TOKEN_WITHDRAW_TYPES.OFF_CHAIN,
    color: '#2c2c2c',
    iconUrl:
      'https://seeklogo.com/images/U/usdk-usdk-logo-2ABC07CB51-seeklogo.com.png',
  },
  {
    name: 'USDK-W',
    symbol: USDK_W,
    type: TOKEN_TYPES.OFF_CHAIN,
    withdrawType: TOKEN_WITHDRAW_TYPES.OFF_CHAIN,
    color: '#2c2c2c',
    iconUrl:
      'https://seeklogo.com/images/U/usdk-usdk-logo-2ABC07CB51-seeklogo.com.png',
  },
];

async function bootstrap() {
  ;
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const tokenModel = appContext.get<Model<Token>>(Token.name + 'Model');
  const tokenSettingModel = appContext.get<Model<Token>>(
    TokenSetting.name + 'Model',
  );

  const networkModel = await appContext.get<Model<Token>>(
    Network.name + 'Model',
  );

  const withdrawSettingModel = await appContext.get<Model<WithdrawSetting>>(
    WithdrawSetting.name + 'Model',
  );

  const platformModel = await appContext.get<Model<Platform>>(
    Platform.name + 'Model',
  );

  const network = await networkModel.findOne({});

  for (const tokenData of tokensToSeed) {
    try {
      const existingToken = await tokenModel
        .findOne({ symbol: tokenData.symbol })
        .exec();

      if (!existingToken) {
        const createdToken = await tokenModel.create({
          ...tokenData,
          networks: [network._id],
        });

        await tokenSettingModel.create({ token: createdToken._id });
      }

      const newToken = await tokenModel
        .findOne({ symbol: tokenData.symbol })
        .exec();

      // Check if withdrawSettingModel exists for the fromToken
      const existingWithdrawSetting = await withdrawSettingModel
        .findOne({ fromToken: newToken._id })
        .exec();

      const horysmallPlatfrom = await platformModel
        .findOne({ symbol: PLATFORMS.HORYSMALL })
        .exec();

      if (!existingWithdrawSetting) {
        // Only create new withdrawSetting if it doesn't exist
        const abc = await withdrawSettingModel.create({
          fromToken: newToken._id,
          toToken: newToken._id,
          fee: 0,
          feeType: ChargesType.FIXED,
          commission: 0,
          commissionType: ChargesType.FIXED,
          type: WITHDRAW_TYPES.EXTERNAL,
          minAmount: 0,
          minDisplayAmount: 0,
          minWithdrawableAmount: 0,
          platform: horysmallPlatfrom._id,
          isEnable: true,
        });
      } else {
        await withdrawSettingModel.updateOne(
          { _id: existingWithdrawSetting._id },
          { platform: horysmallPlatfrom._id },
        );
      }
    } catch (error) {
      throw error;
    }
  }

  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
