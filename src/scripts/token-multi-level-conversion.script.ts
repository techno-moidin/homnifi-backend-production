import { program } from 'commander';
import fs from 'fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/src/app.module';
import { Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import pLimit from 'p-limit';
import { Token } from '../token/schemas/token.schema';
import { getModelToken } from '@nestjs/mongoose';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const tokenModel = appContext.get(getModelToken(Token.name));

  try {
    const tokens = await tokenModel.find().exec();

    const updatedTokens = tokens.map(async (token) => {
      if (
        token.symbol.toLowerCase() === 'btc' ||
        token.symbol.toLowerCase() === 'sol' ||
        token.symbol.toLowerCase() === 'busd' ||
        token.symbol.toLowerCase() === 'bnb' ||
        token.symbol.toLowerCase() === 'usdt' ||
        token.symbol.toLowerCase() === 'usdc'
      ) {
        token.conversionType = 'dynamic';
        token.pairValue = null;
      } else if (token.symbol.toLowerCase() === 'tomo') {
        token.conversionType = 'custom';
        token.customRate = 0.025;
      } else {
        token.conversionType = 'dynamic';
        token.pairValue = 'lykusdt';
      }
      await token.save();
      return token;
    });

    await Promise.all(updatedTokens);

    console.log('Tokens updated successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error updating tokens:', error);
    process.exit(0);
  } finally {
    await appContext.close();
    process.exit(0);
  }
}

bootstrap().catch((error) => {
  console.error('Error running script:', error);
  process.exit(1);
});
