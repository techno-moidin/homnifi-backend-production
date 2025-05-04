import { Model } from 'mongoose';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { CloudKAutoCompoundPenalty } from '../cloud-k/schemas/ac-penalty.schema';
import { CloudKInflation } from '../cloud-k/schemas/cloudk-inflation.schema';
import { CloudKInflationRules } from '../cloud-k/schemas/cloudk-inflation-rules.schema';
import { CloudKSetting } from '../cloud-k/schemas/cloudk-setting.schema';
import { Token } from '../token/schemas/token.schema';
import { CloudKProduct } from '../cloud-k/schemas/cloudk-products.schema';
import { CloudKSimulationMachine } from '../cloud-k/schemas/cloudk-simulation-machine.schema';
import { CloudKKillSetting } from '../cloud-k/schemas/cloudk-kill.schema';

const inflationsRulesData = [
  {
    dropPercentage: 0,
    productionDecreasePercentage: 0,
    increaseDLPPercentage: 0,
    mintingBoost: 0,
  },
  {
    dropPercentage: 5,
    productionDecreasePercentage: 0,
    increaseDLPPercentage: 0,
    mintingBoost: 0,
  },
  {
    dropPercentage: 10,
    productionDecreasePercentage: 5,
    increaseDLPPercentage: 5,
    mintingBoost: 0,
  },
  {
    dropPercentage: 15,
    productionDecreasePercentage: 5,
    increaseDLPPercentage: 5,
    mintingBoost: 0,
  },
  {
    dropPercentage: 20,
    productionDecreasePercentage: 10,
    increaseDLPPercentage: 10,
    mintingBoost: 0.01,
  },
  {
    dropPercentage: 25,
    productionDecreasePercentage: 10,
    increaseDLPPercentage: 10,
    mintingBoost: 0.01,
  },
  {
    dropPercentage: 30,
    productionDecreasePercentage: 15,
    increaseDLPPercentage: 5,
    mintingBoost: 0.02,
  },
  {
    dropPercentage: 35,
    productionDecreasePercentage: 20,
    increaseDLPPercentage: 5,
    mintingBoost: 0.03,
  },
  {
    dropPercentage: 40,
    productionDecreasePercentage: 25,
    increaseDLPPercentage: 5,
    mintingBoost: 0.04,
  },
  {
    dropPercentage: 45,
    productionDecreasePercentage: 30,
    increaseDLPPercentage: 5,
    mintingBoost: 0.05,
  },
  {
    dropPercentage: 50,
    productionDecreasePercentage: 35,
    increaseDLPPercentage: 5,
    mintingBoost: 0.06,
  },
  {
    dropPercentage: 55,
    productionDecreasePercentage: 40,
    increaseDLPPercentage: 5,
    mintingBoost: 0.07,
  },
  {
    dropPercentage: 60,
    productionDecreasePercentage: 45,
    increaseDLPPercentage: 5,
    mintingBoost: 0.08,
  },
  {
    dropPercentage: 65,
    productionDecreasePercentage: 50,
    increaseDLPPercentage: 5,
    mintingBoost: 0.09,
  },
  {
    dropPercentage: 70,
    productionDecreasePercentage: 55,
    increaseDLPPercentage: 5,
    mintingBoost: 0.1,
  },
  {
    dropPercentage: 75,
    productionDecreasePercentage: 60,
    increaseDLPPercentage: 5,
    mintingBoost: 0.11,
  },
  {
    dropPercentage: 80,
    productionDecreasePercentage: 65,
    increaseDLPPercentage: 5,
    mintingBoost: 0.12,
  },
  {
    dropPercentage: 85,
    productionDecreasePercentage: 65,
    increaseDLPPercentage: 5,
    mintingBoost: 0.12,
  },
  {
    dropPercentage: 90,
    productionDecreasePercentage: 65,
    increaseDLPPercentage: 5,
    mintingBoost: 0.12,
  },
  {
    dropPercentage: 95,
    productionDecreasePercentage: 65,
    increaseDLPPercentage: 5,
    mintingBoost: 0.12,
  },
];

const products = [
  {
    url: 'https://example.com/product/XK500',
    imageUrl:
      'https://storage.googleapis.com/softbuilder/homnifi/img/new-product/01-L-Horys%20BreezeHomni_.jpg',
    externalProductId: 'EXdd4T41234123',
    name: 'Homnifi MiniMax',
    price: 100,
    mintingPowerPerc: 0.16,
    defiPortal: true,
    stakeLimit: 1000,
    airdropPromo: 0,
    launchpadAirdrop: 5,
    licenseName: 'PLUS 60 DAYS',
    profitSplitFee: 50,
    quantwiseCapping: 500,
    aiTradingSoftwareName: 'CRYPTO GPT 1',
    superNodeLevel: 0,
    globalPool: 0,
    bonus: 0,
  },
  {
    url: 'https://example.com/product/XK500',
    imageUrl:
      'https://storage.googleapis.com/softbuilder/homnifi/img/new-product/01-L-Horys%20AirStreamHomni_.jpg',
    externalProductId: 'EXdd4T41234124',
    name: 'Homnifi AirStream',
    price: 500,
    mintingPowerPerc: 0.18,
    defiPortal: true,
    stakeLimit: 5000,
    airdropPromo: 25,
    launchpadAirdrop: 100,
    licenseName: 'PLUS YEARLY',
    profitSplitFee: 50,
    quantwiseCapping: 5000,
    aiTradingSoftwareName: 'CRYPTO GPT 1',
    superNodeLevel: 0,
    globalPool: 500,
    bonus: 500,
  },
  {
    url: 'https://example.com/product/XK500',
    imageUrl:
      'https://storage.googleapis.com/softbuilder/homnifi/img/new-product/01-L-Horys%20BreezeHomni_.jpg',
    externalProductId: 'EXdd4T41234125',
    name: 'Homnifi Breeze',
    price: 1500,
    mintingPowerPerc: 0.19,
    defiPortal: true,
    stakeLimit: 15000,
    airdropPromo: 75,
    launchpadAirdrop: 300,
    licenseName: 'PRO YEARLY',
    profitSplitFee: 45,
    quantwiseCapping: 15000,
    aiTradingSoftwareName: 'CRYPTO GPT 1',
    superNodeLevel: 1,
    globalPool: 1500,
    bonus: 1500,
  },
  {
    url: 'https://example.com/product/XK500',
    imageUrl:
      'https://storage.googleapis.com/softbuilder/homnifi/img/new-product/01-L-Horys%20CycloneHomni_.jpg',
    externalProductId: 'EXdd4T41234126',
    name: 'Homnifi Cyclone',
    price: 4500,
    mintingPowerPerc: 0.21,
    defiPortal: true,
    stakeLimit: 45000,
    airdropPromo: 225,
    launchpadAirdrop: 900,
    licenseName: 'EXPERT YEARLY',
    profitSplitFee: 40,
    quantwiseCapping: 45000,
    aiTradingSoftwareName: 'CRYPTO GPT 1',
    superNodeLevel: 2,
    globalPool: 4500,
    bonus: 4500,
  },
  {
    url: 'https://example.com/product/XK500',
    imageUrl:
      'https://storage.googleapis.com/softbuilder/homnifi/img/new-product/01-L-Horys%20DynamoHomni_.jpg',
    externalProductId: 'EXdd4T41234127',
    name: 'Homnifi Dynamo',
    price: 10000,
    mintingPowerPerc: 0.22,
    defiPortal: true,
    stakeLimit: 100000,
    airdropPromo: 500,
    launchpadAirdrop: 2000,
    licenseName: 'MASTER YEARLY',
    profitSplitFee: 30,
    quantwiseCapping: 100000,
    aiTradingSoftwareName: 'CRYPTO GPT 1',
    superNodeLevel: 3,
    globalPool: 10000,
    bonus: 10000,
  },
  {
    url: 'https://example.com/product/XK500',
    imageUrl:
      'https://storage.googleapis.com/softbuilder/homnifi/img/new-product/01-L-Horys%20ElevateHomni_.jpg',
    externalProductId: 'EXdd4T41234128',
    name: 'Homnifi Elevate',
    price: 25000,
    mintingPowerPerc: 0.25,
    defiPortal: true,
    stakeLimit: 250000,
    airdropPromo: 1250,
    launchpadAirdrop: 5000,
    licenseName: 'MASTER LIFETIME',
    profitSplitFee: 30,
    quantwiseCapping: null,
    aiTradingSoftwareName: 'CRYPTO GPT 1',
    superNodeLevel: 4,
    globalPool: 25000,
    bonus: 25000,
  },
  {
    url: 'https://example.com/product/XK500',
    imageUrl:
      'https://storage.googleapis.com/softbuilder/homnifi/img/new-product/01-L-Horys%20FlashHomni_.jpg',
    externalProductId: 'EXdd4T41234129',
    name: 'Homnifi Flash',
    price: 50000,
    mintingPowerPerc: 0.27,
    defiPortal: true,
    stakeLimit: 0,
    stakeUnlimited: true,
    airdropPromo: 2500,
    launchpadAirdrop: 10000,
    licenseName: 'MASTER LIFETIME',
    profitSplitFee: 30,
    quantwiseCapping: null,
    aiTradingSoftwareName: 'CRYPTO GPT 1',
    superNodeLevel: 5,
    globalPool: 50000,
    bonus: 50000,
  },
];

export async function seedCloudKData(appContext: INestApplicationContext) {
  const penaltyPercentageModel = appContext.get<
    Model<CloudKAutoCompoundPenalty>
  >(CloudKAutoCompoundPenalty.name + 'Model');
  const inflationModel = appContext.get<Model<CloudKInflation>>(
    CloudKInflation.name + 'Model',
  );
  const inflationRulesModel = appContext.get<Model<CloudKInflationRules>>(
    CloudKInflationRules.name + 'Model',
  );
  const settingsModel = appContext.get<Model<CloudKSetting>>(
    CloudKSetting.name + 'Model',
  );

  await penaltyPercentageModel.create({
    percentage: 30,
  });

  const inflation = await inflationModel.create({
    adminNote: 'Initial',
    name: 'Initial Rules',
  });

  const initialInflationRulesData = inflationsRulesData.map((item) => ({
    ...item,
    inflation: inflation._id,
  }));

  await inflationRulesModel.create(initialInflationRulesData);

  const tokenModel = appContext.get<Model<Token>>(Token.name + 'Model');
  const rewardToken = await tokenModel.findOne({ symbol: 'LYK-W' });
  const stakeToken = await tokenModel.findOne({ symbol: 'mLYK' });

  await settingsModel.create({
    rewardToken: rewardToken._id,
    stakeToken: stakeToken._id,
  });

  const productsModel = appContext.get<Model<CloudKProduct>>(
    CloudKProduct.name + 'Model',
  );

  const simulationMachineModel = appContext.get<Model<CloudKSimulationMachine>>(
    CloudKSimulationMachine.name + 'Model',
  );

  const killSettingsModel = appContext.get<Model<CloudKKillSetting>>(
    CloudKKillSetting.name + 'Model',
  );

  for (const product of products) {
    const prd = await productsModel.create(product);
    await simulationMachineModel.create({
      product: prd._id,
      name: prd.name,
      imageUrl: prd.imageUrl,
      stakeLimit: prd.stakeLimit,
      stakeUnlimited: prd.stakeUnlimited,
      allTimeHigh: 0,
      dlp: 0,
      mintingPower: prd.mintingPowerPerc / 100,
      boost: 0,
    });
  }

  await killSettingsModel.create({
    stakeEnabled: true,
    claimEnabled: true,
    machineBuyEnabled: true,
    rewardsJobEnabled: true,
  });
}
