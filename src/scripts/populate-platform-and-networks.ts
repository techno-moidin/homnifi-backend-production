import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import mongoose, { Model, Types } from 'mongoose';
import { News } from '../news/schemas/news.schema';
import { DepositSetting } from '../token/schemas/deposit.settings.schema';
import { Platform } from '../platform/schemas/platform.schema';
import { PLATFORMS } from '../global/enums/wallet.enum';
import {
  NetworkSettings,
  NetworkSettingsType,
} from '../platform/schemas/network-settings.schema';
import { ChargesType } from '../global/enums/charges.type.enum';
import { Network } from '../token/schemas/network.schema';
import { INestApplicationContext } from '@nestjs/common';
import { WithdrawSetting } from '../token/schemas/withdraw.settings.schema';

async function doPopulate(settingsModal, appContext: INestApplicationContext) {
  ;

  const platformModal = appContext.get<Model<Platform>>(
    Platform.name + 'Model',
  );

  const networkModel = appContext.get<Model<Network>>(Network.name + 'Model');

  if (!networkModel) {
    console.error('Network model not found');
    process.exit(1);
  }

  if (!platformModal) {
    console.error('Platform model not found');
    process.exit(1);
  }

  const allPlatforms = await platformModal.find({
    deletedAt: null,
    status: 'active',
  });

  if (!allPlatforms) {
    console.error('Homnifi platform not found');
    process.exit(1);
  }

  const allNetworks = await networkModel.find({ deletedAt: null });

  if (!allNetworks) {
    console.error('No networks found');
    process.exit(1);
  }

  const defaultNetworkData = allNetworks.map((net) => {
    return {
      networkId: new Types.ObjectId(net._id.toString()),
      commissionFixedValue: null,
      commissionType: ChargesType.FIXED,
      commissionValue: 0,
      feeFixedValue: null,
      feeType: ChargesType.FIXED,
      feeValue: 0,
    } as NetworkSettings;
  });

  console.info('⭐⭐⭐ Populate get started');
  const depositSettings = await settingsModal.find({ deletedAt: null });
  // console.log(
  //   'Fetched depositSettings data, total news count ->',
  //   depositSettings.length,
  //   'Fetched Platform',
  //   allPlatforms.length,
  // );
  try {
    // Deleting the existing settings
    for (let i = 0; i < depositSettings.length; i++) {
      const settings = depositSettings[i].toObject();
      if (settings.platform && Types.ObjectId.isValid(settings.platform)) {
        console.info(
          '⭐⭐⭐❌ Skipped ON Delete: Already has the platform' + settings._id,
        );
        continue;
      }
      await settingsModal.findByIdAndUpdate(
        depositSettings[i]._id,
        {
          isEnable: false,
          deletedAt: new Date(),
        },
        { new: false, validateBeforeSave: false },
      );
    }

    // Creating new settings for Each Platform
    for (let i = 0; i < allPlatforms.length; i++) {
      for (let j = 0; j < depositSettings.length; j++) {
        const settings = depositSettings[j];
        console.info('⭐⭐⭐ Creating the New setting for ID:' + settings._id);

        const newSettingsData = settings.toObject();
        delete newSettingsData._id;

        if (
          newSettingsData.platform &&
          Types.ObjectId.isValid(newSettingsData.platform)
        ) {
          console.info(
            '⭐⭐⭐⭐ Skipped: Already has the platform' + settings._id,
          );
          continue;
        }

        newSettingsData.platform = allPlatforms[i]
          ._id as unknown as mongoose.Schema.Types.ObjectId;
        newSettingsData.deletedAt = null;
        newSettingsData.networks = defaultNetworkData;

        const result = await settingsModal.create(newSettingsData);

        ;
      }
    }
  } catch (e) {
    console.error('Error populating database:', e);
    process.exit(1);
  }
}
async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const depositSettingModel = appContext.get<Model<DepositSetting>>(
    DepositSetting.name + 'Model',
  );
  const withdrawSettingModel = appContext.get<Model<WithdrawSetting>>(
    WithdrawSetting.name + 'Model',
  );
  await doPopulate(depositSettingModel, appContext);
  await doPopulate(withdrawSettingModel, appContext);
  console.info('Good Job ✅, All done!');
  process.exit(0);
}
bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
