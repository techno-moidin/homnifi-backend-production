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
import { DepositSetting } from '../token/schemas/deposit.settings.schema';
import { WithdrawSetting } from '../token/schemas/withdraw.settings.schema';
import { WITHDRAW_TYPES } from '../token/enums/withdraw-types.enum';
import { SwapSetting } from '../token/schemas/swap.settings.schema';

const createDepositSettings = async (
  tokenModel,
  depositSettingModel,
  logger,
) => {
  try {
    const fromToken = await tokenModel.findOne({
      symbol: 'LYK',
    });

    const toToken = await tokenModel.findOne({
      symbol: 'mLYK',
    });

    await depositSettingModel.create({
      fromToken: fromToken._id,
      toToken: toToken._id,
    });
  } catch (error) {
    logger.error('Unable to create token deposit settings ' + error.msg);
    throw error;
  }
};

const createWithdrawSettings = async (
  tokenModel,
  withdrawSettingModel,
  logger,
) => {
  try {
    const fromToken = await tokenModel.findOne({
      symbol: 'LYK',
    });

    const toToken = await tokenModel.findOne({
      symbol: 'LYK',
    });

    await withdrawSettingModel.create({
      fromToken: fromToken._id,
      toToken: toToken._id,
      fee: 2,
      feeType: ChargesType.FIXED,
      commission: 0,
      commissionType: ChargesType.FIXED,
      type: WITHDRAW_TYPES.EXTERNAL,
    });

    await withdrawSettingModel.create({
      fromToken: fromToken._id,
      toToken: toToken._id,
      fee: 0,
      feeType: ChargesType.FIXED,
      commission: 0,
      commissionType: ChargesType.FIXED,
      type: WITHDRAW_TYPES.INTERNAL,
    });
  } catch (error) {
    logger.error('Unable to create token withdraw settings ' + error.msg);
    throw error;
  }
};

const createSwapSettings = async (tokenModel, withdrawSettingModel, logger) => {
  try {
    const fromToken = await tokenModel.findOne({
      symbol: 'LYK',
    });

    const toToken = await tokenModel.findOne({
      symbol: 'sLYK',
    });

    await withdrawSettingModel.create({
      fromToken: fromToken._id,
      toToken: toToken._id,
      fee: 2,
      feeType: ChargesType.FIXED,
      commission: 0,
      commissionType: ChargesType.FIXED,
      type: WITHDRAW_TYPES.EXTERNAL,
    });
  } catch (error) {
    logger.error('Unable to create token withdraw settings ' + error.msg);
    throw error;
  }
};

export async function seedTrxSettings(appContext: INestApplicationContext) {
  const logger = new Logger(seedTrxSettings.name);

  const tokenModel = appContext.get<Model<Token>>(Token.name + 'Model');
  const depositSettingModel = appContext.get<Model<DepositSetting>>(
    DepositSetting.name + 'Model',
  );
  await createDepositSettings(tokenModel, depositSettingModel, logger);

  const withdrawSettingModel = appContext.get<Model<WithdrawSetting>>(
    WithdrawSetting.name + 'Model',
  );
  await createWithdrawSettings(tokenModel, withdrawSettingModel, logger);

  const swapSettingModel = appContext.get<Model<SwapSetting>>(
    SwapSetting.name + 'Model',
  );
  await createSwapSettings(tokenModel, swapSettingModel, logger);
}
