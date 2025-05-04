import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { Token } from '../token/schemas/token.schema'; // Adjust the import path as necessary

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const tokenModel = appContext.get<Model<Token>>(Token.name + 'Model');

  // Define the symbols to check against
  const usdSymbols = ['USDK', 'USDK-VOUCHER', 'usdk-w', 'udk', 'USDK-PROMO', 'usdk'];
  const valueTypeUSD = 'USD';
  const valueTypeLYK = 'LYK';

  // Retrieve all tokens
  const tokens : any = await tokenModel.find();

  for (const token of tokens) {
    // Check if the token's symbol is in the usdSymbols array
    if (usdSymbols.includes(token.symbol)) {
      token.valueType = valueTypeUSD; // Update valueType to USD
    } else {
      token.valueType = valueTypeLYK; // Update valueType to LYK for all other tokens
    }

    await token.save(); // Save the updated token
    ;
  }

  ;
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error updating tokens:', err);
  process.exit(1);
});
