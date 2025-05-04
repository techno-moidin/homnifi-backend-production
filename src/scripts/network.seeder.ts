import { INestApplicationContext, Logger } from '@nestjs/common';
import { Network } from '../token/schemas/network.schema';
import { Model } from 'mongoose';
import { Token } from '../token/schemas/token.schema';

export async function seedNetworks(appContext: INestApplicationContext) {
  const logger = new Logger();
  const networkModel = appContext.get<Model<Token>>(Network.name + 'Model');

  const networkToSeed = {
    name: 'MATIC',
    code: 'matic',
  };

  try {
    const networkDoc = await networkModel.findOne({
      code: networkToSeed.code,
    });

    if (!networkDoc) {
      await networkModel.create(networkToSeed);
      logger.log(`Seeding network ${networkToSeed.name}`);
    }
  } catch (e) {
    logger.error(`Error while seeding network ${networkToSeed.name}`);
  }
}
