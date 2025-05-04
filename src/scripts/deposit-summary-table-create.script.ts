import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { TasksService } from '../tasks/tasks.service';
import * as fs from 'fs';
import * as path from 'path';
import { TokenService } from '../token/token.service';
import { DepositTransactionSummary } from '../wallet/schemas/deposit.summary.schema';
import { Model } from 'mongoose';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const tokenService = appContext.get(TokenService);
  const depositTransaction = appContext.get<Model<DepositTransactionSummary>>(
    DepositTransactionSummary.name + 'Model',
  );

  // Define the path to the JSON file
  // const filePath = path.join(
  //   __dirname,
  //   '/data/homnifi-prod.deposittransactions.json',
  // );
  // if (!fs.existsSync(filePath)) {
  //   throw new Error(`File not found: ${filePath}`);
  // }
  // // Read the JSON file synchronously
  // const jsonData = await fs.readFileSync(filePath, 'utf-8');

  // // Parse the JSON data
  // const data = JSON.parse(jsonData);

  const summary: any = await tokenService.getDepositSummaryScript();

  const data = summary.data.map((d) => {
    return {
      amount: d.totalAmount,
      token: d.tokenId,
      tokenSymbol: d.symbol,
      network: d.networkId,
      networkName: d.network,
    };
  });

  await depositTransaction.insertMany(data);

  

  await appContext.close();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
