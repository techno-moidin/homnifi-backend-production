import { Model } from 'mongoose';
import { ChargesType } from '../global/enums/charges.type.enum';
import { ProcessType } from '../global/enums/process.enum';
import { TrxType } from '../global/enums/trx.type.enum';
import { Token } from '../token/schemas/token.schema';
import { TokenSetting } from '../token/schemas/token.setting.schema';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { mainTokenSymbol } from '../global/constants';
import { TOKEN_TYPES, TOKEN_WITHDRAW_TYPES } from '../global/enums/wallet.enum';
import { Network } from '../token/schemas/network.schema';

const tokensToSeed = [
  {
    name: 'LYK',
    symbol: 'LYK',
    type: TOKEN_TYPES.ON_CHAIN,
    withdrawType: TOKEN_WITHDRAW_TYPES.ON_CHAIN,
    color: '#F7931A',
    iconUrl: 'https://storage.googleapis.com/softbuilder/homnifi/token/LYK.png',
  },
  {
    name: 'LYK-W',
    symbol: 'LYK-W',
    type: TOKEN_TYPES.OFF_CHAIN,
    withdrawType: TOKEN_WITHDRAW_TYPES.OFF_CHAIN,
    color: '#F7931A',
    iconUrl: 'https://storage.googleapis.com/softbuilder/homnifi/token/LYK.png',
  },
  {
    name: 'sLYK',
    symbol: 'sLYK',
    type: TOKEN_TYPES.OFF_CHAIN,
    withdrawType: TOKEN_WITHDRAW_TYPES.OFF_CHAIN,
    color: '#53AE94',
    iconUrl:
      'https://storage.googleapis.com/softbuilder/homnifi/token/sLYK.png',
  },
  {
    name: 'mLYK',
    symbol: 'mLYK',
    type: TOKEN_TYPES.OFF_CHAIN,
    withdrawType: TOKEN_WITHDRAW_TYPES.OFF_CHAIN,
    color: '#3B89FF',
    iconUrl:
      'https://storage.googleapis.com/softbuilder/homnifi/token/mLYK.png',
  },
  {
    name: 'cLfi-W',
    symbol: 'cLfi-W',
    type: TOKEN_TYPES.OFF_CHAIN,
    withdrawType: TOKEN_WITHDRAW_TYPES.OFF_CHAIN,
    color: '#478CCF',
    iconUrl: 'https://storage.googleapis.com/softbuilder/homnifi/img/CLFI.png',
  },
  {
    name: 'USDK',
    symbol: 'USDK',
    type: TOKEN_TYPES.OFF_CHAIN,
    withdrawType: TOKEN_WITHDRAW_TYPES.OFF_CHAIN,
    color: '#2c2c2c',
    iconUrl:
      'https://seeklogo.com/images/U/usdk-usdk-logo-2ABC07CB51-seeklogo.com.png',
  },
];

export async function seedTokens(appContext: INestApplicationContext) {
  const logger = new Logger(seedTokens.name);

  const tokenModel = appContext.get<Model<Token>>(Token.name + 'Model');
  const tokenSettingModel = appContext.get<Model<Token>>(
    TokenSetting.name + 'Model',
  );

  const networkModel = await appContext.get<Model<Token>>(
    Network.name + 'Model',
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

        logger.log(`Token seeded: ${createdToken.name}`);
      } else logger.error(`Token already exists: ${tokenData.name}`);
    } catch (error) {
      logger.error(`Error seeding token ${tokenData.name}: ${error.message}`);
      throw error;
    }
  }
}
