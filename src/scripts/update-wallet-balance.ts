import fs from 'fs';
import path from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/src/app.module';
import { WalletService } from '@/src/wallet/wallet.service';
import pLimit from 'p-limit';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const walletService = appContext.get(WalletService);
  const walletTransactionModel = appContext.get('WalletTransactionModel');

  try {
    console.log('Fetching all wallets...');
    const wallets = await walletService.getAllWallets();
    console.log(`Fetched ${wallets.length} wallets`);

    const limit = pLimit(20); // Limit the number of concurrent operations
    const batchSize = 4000; // Set batch size, this can be adjusted
    const results = [];

    // Function to process wallets in batches
    const processBatch = async (batch: any[]) => {
      const tasks = batch.map((wallet: any) =>
        limit(async () => {
          try {
            console.log(`Processing wallet ${wallet._id}`);
            const transactions = await walletTransactionModel.find({
              wallet: wallet._id,
              deletedAt: null,
            });

            const totalIn = transactions
              .filter((tx: any) => tx.transactionFlow === 'in')
              .reduce((sum: any, tx: any) => sum + tx.amount, 0);

            const totalOut = transactions
              .filter((tx: any) => tx.transactionFlow === 'out')
              .reduce((sum: any, tx: any) => sum + tx.amount, 0);

            const netAmount = totalIn - totalOut;
            wallet.totalBalanceinToken = netAmount.toFixed(7);

            // Save wallet and check for errors
            const savedWallet = await wallet.save();

            results.push({
              walletId: wallet._id,
              userId: wallet.user,
              totalIn,
              totalOut,
              netAmount,
            });
          } catch (error) {
            console.error(`Failed to process wallet ${wallet._id}:`, error);
          }
        }),
      );

      await Promise.all(tasks);
    };

    // Process wallets in batches
    for (let i = 0; i < wallets.length; i += batchSize) {
      const batch = wallets.slice(i, i + batchSize);
      console.log(
        `Processing batch ${i / batchSize + 1} of ${Math.ceil(wallets.length / batchSize)}`,
      );
      await processBatch(batch);
    }

    // Save results to a JSON file
    const json = JSON.stringify(results, null, 2);
    const outputPath = path.resolve(process.cwd(), 'wallet-transactions.json');
    fs.writeFileSync(outputPath, json);
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    await appContext.close();
  }
}

bootstrap();
