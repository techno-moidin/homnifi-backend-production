import * as fs from 'fs';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { MachineTrackingService } from '../machine-tracking/machine-tracking.service';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { CloudKProduct } from '../cloud-k/schemas/cloudk-products.schema';

async function parseFile(filePath: string): Promise<any[]> {
  try {
    const fileContent = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent); // Convert string to JSON array
  } catch (error) {
    console.error('Error reading or parsing the JSON file:', error.message);
    process.exit(1);
  }
}

async function bootstrap() {
  const jsonFile = 'nodek-products-info.json';
  const jsonFilePath = path.join(process.cwd(), jsonFile);

  if (!fs.existsSync(jsonFilePath)) {
    console.error(`File not found: ${jsonFilePath}`);
    process.exit(1);
  }

  try {
    console.log('Starting  processing...');
    const appContext = await NestFactory.createApplicationContext(AppModule);
    const nodekProductModel = appContext.get<Model<CloudKProduct>>(
      CloudKProduct.name + 'Model',
    );

    const records = await parseFile(jsonFilePath);

    if (!Array.isArray(records)) {
      console.error('Invalid JSON format: Expected an array.');
      process.exit(1);
    }
    const processedData = records.map((d) => {
      if (typeof d.defiPortal === 'string') {
        d.defiPortal = d.defiPortal.toLowerCase() === 'true' ? true : false;
      }
      if (typeof d.bestValue === 'string') {
        d.bestValue = d.bestValue.toLowerCase() === 'true' ? true : false;
      }
      if (typeof d.stakeUnlimited === 'string') {
        d.stakeUnlimited =
          d.stakeUnlimited.toLowerCase() === 'true' ? true : false;
      }
      if (typeof d.isActiveMintingPercentage === 'string') {
        d.isActiveMintingPercentage =
          d.isActiveMintingPercentage.toLowerCase() === 'true' ? true : false;
      }

      return {
        name: d.name,
        url: d.url,
        imageUrl: d.imageUrl,
        externalProductId: d.externalProductId ?? null,
        price: d.price ?? 0,
        mintingPowerPerc: d.mintingPowerPerc ?? 0,
        stakeLimit: d.stakeLimit ?? 0,
        defiPortal: d.defiPortal ?? false,
        airdropPromo: d.airdropPromo ?? 0,
        launchpadAirdrop: d.launchpadAirdrop ?? 0,
        licenseName: d.licenseName ?? '',
        profitSplitFee: d.profitSplitFee ?? 0,
        quantwiseCapping: d.quantwiseCapping ?? 0,
        aiTradingSoftwareName: d.aiTradingSoftwareName ?? '',
        superNodeLevel: d.superNodeLevel ?? 0,
        globalPool: d.globalPool ?? 0,
        bonus: d.bonus ?? 0,
        createdAt: new Date(),
        updatedAt: null,
        bestValue: d.bestValue ?? false,
        stakeUnlimited: d.stakeUnlimited ?? false,
        countryPoints: d.countryPoints ?? 0,
        superNodeCapping: d.superNodeCapping ?? 0,
        additionalMintingPower: d.additionalMintingPower ?? 0,
        isActiveMintingPercentage: d.isActiveMintingPercentage ?? false,
        mintingPercentageId: d.mintingPercentageId,
        additionalMintingPowerId: d.additionalMintingPowerId,
        additionalMintingPowerPercentage:
          d.additionalMintingPowerPercentage ?? 0,
        additionalMintingPowerStatus: d.additionalMintingPowerStatus,
        actveGenRewardPercentageId: d.actveGenRewardPercentageId,
        genRewardPercentage: d.genRewardPercentage ?? 0,
        remark: 'created by import script',
      };
    });
    console.log(`Inserting ${records.length} records into the database...`);
    console.log(processedData);
    await nodekProductModel.insertMany(processedData);

    console.log(' processing completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error processing :', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
