import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { Model } from 'mongoose';
import { UserTwoAccess } from '../users/schemas/user-twoAccess.schema';
import path from 'path';
import fs from 'fs';
import { format } from 'fast-csv';
import { CloudKMachine } from '../cloud-k/schemas/cloudk-machine.schema';
async function run() {
  const startTime = Date.now();

  try {
    console.log(`[${new Date().toISOString()}] Starting processing`);

    const appContext = await NestFactory.createApplicationContext(AppModule);

    const CloudKMachineModel: Model<CloudKMachine> = appContext.get(
      CloudKMachine.name + 'Model',
    );

    const outputPath = path.resolve(process.cwd(), 'cloudk-machines-data.csv');
    const writeStream = fs.createWriteStream(outputPath);
    const csvStream = format({ headers: true });
    csvStream.pipe(writeStream);

    const cloudkAggregateResult = CloudKMachineModel.aggregate([
      {
        $match: {
          deletedAt: null,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            {
              $project: {
                blockchainId: 1,
                _id: 1,
              },
            },
          ],
        },
      },

      {
        $lookup: {
          from: 'cloudkproducts',
          localField: 'product',
          foreignField: '_id',
          as: 'productData',
          pipeline: [
            {
              $project: {
                externalProductId: 1,
                _id: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: { path: '$user', preserveNullAndEmptyArrays: false },
      },

      {
        $unwind: { path: '$productData', preserveNullAndEmptyArrays: false },
      },
      {
        $set: {
          meta: {
            autoCompound: '$autoCompound',
            lockedPrice: '$lockedPrice',
            dlp: '$dlp',
            userId: '$user._id',
            productId: '$productData._id',
          },
        },
      },
      {
        $project: {
          userBid: '$user.blockchainId',
          serialNumber: 1,
          uniqueName: 1,
          name: 1,
          imageUrl: 1,
          externalMachineId: 1,
          startDate: 1,
          externalProductId: '$productData.externalProductId',
          assignedSerialNumber: 1, // updated on 3/3/2025
          endDate: 1,
          product: 1,
          meta: 1,
        },
      },
    ]).cursor({ batchSize: 100 });
    try {
      for await (const doc of cloudkAggregateResult) {
        csvStream.write({
          ...doc,
          assignedSerialNumber: doc.assignedSerialNumber,
          startDate: new Date(doc.startDate).toISOString(),
          endDate: new Date(doc.endDate).toISOString(),
          createdAt: new Date().toISOString(),
          meta: JSON.stringify(doc.meta),
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
