import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { SwapTransaction } from '../wallet/schemas/swap.transaction.schema';
import { SpecialSwapTransaction } from '../wallet/schemas/special.swap.transaction.schema';
import { SwapTransactionHistory } from '../wallet/schemas/swap.transaction.history.schema';
import { Swap_SpecialSwap_Type } from '../wallet/enums/swap-specialSwap.enum';

const BATCH_SIZE = 20000; // Number of records to process in each batch

async function processSwapBatch(
  swaps: any[],
  SwapTransactionHistoryModel: Model<SwapTransactionHistory>,
  startIndex: number,
  batchSize: number,
  totalLength: number,
) {
  const endIndex = Math.min(startIndex + batchSize, totalLength);
  const batchSwaps = swaps.slice(startIndex, endIndex);

  const swapHistoryEntries = batchSwaps.map((swap: any) => ({
    swap_id: swap?._id || null,
    serialNumber: swap?.serialNumber || null,
    requestId: swap?.requestId || null,
    user: swap?.user || null,
    fromWallet: swap?.fromWallet || null,
    toWallet: swap?.toWallet || null,
    type: swap.type,
    fromWalletTrx: swap?.fromWalletTrx || null,
    toWalletTrx: swap?.toWalletTrx || null,
    amount: swap.amount,
    bonus: swap?.bonus || 0,
    actualAmount: swap?.actualAmount || 0,
    swapAmount: swap?.swapAmount || 0,
    total: swap?.total || 0,
    fee: swap?.fee || 0,
    feeType: swap?.feeType || null,
    commission: swap?.commission || 0,
    commissionType: swap?.commissionType || null,
    tokenPrice: swap?.tokenPrice || null,
    settingsUsed: swap?.settingsUsed || null,
    platform: swap?.platform || null,
    newBalance: swap?.newBalance || 0,
    previousBalance: swap?.previousBalance || 0,
    newBalanceOfToToken: swap?.newBalanceOfToToken || null,
    previousBalanceOfToToken: swap?.previousBalanceOfToToken || null,
    createdAt: swap?.createdAt || null,
    updatedAt: swap?.updatedAt || null,
    deletedAt: swap?.deletedAt || null,
  }));

  await SwapTransactionHistoryModel.insertMany(swapHistoryEntries);

  const progress = Math.round((endIndex / totalLength) * 100);
  console.log(
    `Progress: ${progress}% (${endIndex}/${totalLength} records processed)`,
  );
}

async function bootstrap() {
  console.log('\n====================================');
  console.log('🚀 SWAP MIGRATION SCRIPT STARTED');
  console.log('====================================\n');

  const startTime = Date.now();
  const appContext = await NestFactory.createApplicationContext(AppModule);

  try {
    // Injecting the models
    console.log('📚 Initializing database models...');
    const SwapTransactionModel: Model<SwapTransaction> = appContext.get(
      'SwapTransactionModel',
    );
    const SpecialSwapTransactionModel: Model<SpecialSwapTransaction> =
      appContext.get('SpecialSwapTransactionModel');
    const SwapTransactionHistoryModel: Model<SwapTransactionHistory> =
      appContext.get('SwapTransactionHistoryModel');

    console.log('🔍 Fetching swap transactions...');
    const swaps = await SwapTransactionModel.aggregate([
      {
        $addFields: {
          type: Swap_SpecialSwap_Type.SWAP,
        },
      },
    ]);
    console.log(`✅ Found ${swaps.length} swap transactions`);

    console.log('🔍 Fetching special swap transactions...');
    const specialSwaps = await SpecialSwapTransactionModel.aggregate([
      {
        $addFields: {
          type: Swap_SpecialSwap_Type.SPECIAL_SWAP,
        },
      },
    ]);
    console.log(`✅ Found ${specialSwaps.length} special swap transactions`);

    const mergedSwaps = [...swaps, ...specialSwaps].sort(
      (a, b) => b.createdAt - a.createdAt,
    );

    const totalSwaps = mergedSwaps.length;
    console.log(`\n📊 Total swaps to process: ${totalSwaps}`);
    console.log(`📦 Batch size: ${BATCH_SIZE}`);
    console.log('\n🔄 Starting batch processing...\n');

    // Process in batches
    for (let i = 0; i < totalSwaps; i += BATCH_SIZE) {
      await processSwapBatch(
        mergedSwaps,
        SwapTransactionHistoryModel,
        i,
        BATCH_SIZE,
        totalSwaps,
      );
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n====================================');
    console.log('✨ SWAP MIGRATION COMPLETED SUCCESSFULLY');
    console.log(`⏱️  Total execution time: ${duration} seconds`);
    console.log('====================================\n');
  } catch (err) {
    console.error('\n❌ Error during script execution:', err);
    throw err;
  } finally {
    await appContext.close();
    process.exit(0);
  }
}

bootstrap().catch((err) => {
  console.error('\n❌ Unexpected error during bootstrap:', err);
  process.exit(1);
});
