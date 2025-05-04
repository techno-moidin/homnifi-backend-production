import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { TasksService } from '../tasks/tasks.service';
import * as fs from 'fs';
import * as path from 'path';
import { TokenService } from '../token/token.service';
import { DepositTransactionSummary } from '../wallet/schemas/deposit.summary.schema';
import { Model } from 'mongoose';
import { WithdrawSummary } from '../wallet/schemas/withdraw.summary.schema';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const tokenService = appContext.get(TokenService);
  const withdrawSummary = appContext.get<Model<WithdrawSummary>>(
    WithdrawSummary.name + 'Model',
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

  const summary: any = await tokenService.getWithdrawSummaryScript();

  const data = summary.data.map((d) => {
    return {
      amount: d.totalAmount,
      token: d.tokenId,
      tokenName: d.tokenName,
      symbol: d.symbol,
      networkId: d.networkId,
      networkName: d.network,
      withdrawType: d.withdrawType,
    };
  });

  await withdrawSummary.insertMany(data);

  

  await appContext.close();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
