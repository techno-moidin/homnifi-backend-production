import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { Model } from 'mongoose';
import { UserTwoAccess } from '../users/schemas/user-twoAccess.schema';
import { CloudKProduct } from '../cloud-k/schemas/cloudk-products.schema';
import path from 'path';
import fs from 'fs';
import { pipeline } from 'stream';
import { format } from 'fast-csv';
async function run() {
  const startTime = Date.now();

  try {
    console.log(`[${new Date().toISOString()}] Starting processing`);

    const appContext = await NestFactory.createApplicationContext(AppModule);

    const cloudkProductModel = appContext.get<Model<CloudKProduct>>(
      CloudKProduct.name + 'Model',
    );
    const outputPath = path.join(process.cwd(), 'cloudk-products-data.csv');
    // const outputPath = path.resolve(process.cwd());
    const writeStream = fs.createWriteStream(outputPath);
    const csvStream = format({ headers: true });
    csvStream.pipe(writeStream);

    const cloudkAggregateResult = cloudkProductModel
      .aggregate([{ $match: {} }])
      .cursor({ batchSize: 100 });

    try {
      for await (const doc of cloudkAggregateResult) {
        csvStream.write({
          ...doc,
          updatedAt: new Date(doc.updatedAt).toISOString(),
          createdAt: new Date(doc.createdAt).toISOString(),
        });
      }
    } catch (error) {
      console.error('Error streaming CSV:', error);
      throw error;
    } finally {
      csvStream.end();
    }

    return new Promise((resolve, reject) => {
      writeStream.on('finish', async () => {
        console.log(cloudkAggregateResult);
        await appContext.close();
        resolve(outputPath);

        process.exit(0);
      });

      writeStream.on('error', reject);
    });
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Critical error:`,
      error.message,
    );
    process.exit(1);
  }
}

process.on('uncaughtException', (error) => {
  console.error(
    `[${new Date().toISOString()}] Uncaught exception:`,
    error.message,
  );
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(`[${new Date().toISOString()}] Unhandled rejection:`, reason);
  process.exit(1);
});

run();
