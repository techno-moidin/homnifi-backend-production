import { NestFactory } from '@nestjs/core';
import { Model, Types } from 'mongoose';
import * as fs from 'fs/promises';
import * as path from 'path';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { DepositTransaction } from '@/src/wallet/schemas/deposit.transaction.schema';
import { WalletTransaction } from '@/src/wallet/schemas/wallet.transaction.schema.';
import { User } from '@/src/users/schemas/user.schema';
import { AppModule } from '@/src/app.module';
import { DepositTransactionHistory } from '@/src/wallet/schemas/deposit.history.transaction.schema';
import { WalletService } from '@/src/wallet/wallet.service';
import { Token } from '@/src/token/schemas/token.schema';
import { CloudKService } from '@/src/cloud-k/cloud-k.service';
import { TrxType } from '@/src/global/enums/trx.type.enum';
import { TransactionStatus } from '@/src/global/enums/transaction.status.enum';
import { CloudKAutoCompoundSetting } from '@/src/cloud-k/schemas/cloudk-autoCompound-setting.schema';
import { CloudKReward } from '@/src/cloud-k/schemas/cloudk-reward.schema';
import { CloudKMachine } from '@/src/cloud-k/schemas/cloudk-machine.schema';
import { STATUS_TYPE } from '@/src/supernode/enums/sngp-type.enum';
import { CloudKGlobalAutoCompound } from '@/src/cloud-k/schemas/global-autocompound.schema';

async function bootstrap() {
  console.log('🚀 Starting CloudK Auto Compound Settings update script...');
  const deletedAt = new Date();
  try {
    const appContext = await NestFactory.createApplicationContext(AppModule);
    console.log('✅ NestJS application context created successfully');

    const CloudKAutoCompoundSettingModel = appContext.get<
      Model<CloudKAutoCompoundSetting>
    >(CloudKAutoCompoundSetting.name + 'Model');
    const CloudKMachineModel = appContext.get<Model<CloudKMachine>>(
      CloudKMachine.name + 'Model',
    );

    const CloudKGlobalAutoCompoundModel = appContext.get<
      Model<CloudKGlobalAutoCompound>
    >(CloudKGlobalAutoCompound.name + 'Model');

    const getAllActiveCloudkSettings =
      await CloudKAutoCompoundSettingModel.find({
        status: 'active',
      });

    console.log(
      `📊 Found ${getAllActiveCloudkSettings.length} active CloudK settings`,
    );

    if (getAllActiveCloudkSettings.length) {
      for (let index = 0; index < getAllActiveCloudkSettings.length; index++) {
        const element = getAllActiveCloudkSettings[index];
        console.log(
          `\n🔄 Processing CloudK setting ${index + 1}/${getAllActiveCloudkSettings.length}:`,
          {
            settingId: element._id,
            machineCount: element.machines?.length || 0,
          },
        );

        if (element.machines && element.machines.length > 0) {
          for (
            let machineIndex = 0;
            machineIndex < element.machines.length;
            machineIndex++
          ) {
            const machineElement = element.machines[machineIndex];
            console.log(
              `\n⚙️ Processing machine ${machineIndex + 1}/${element.machines.length}`,
            );

            const findUserCloudkMachine =
              await CloudKMachineModel.findById(machineElement);

            if (!findUserCloudkMachine) {
              console.warn('⚠️ Machine not found:', {
                machineId: machineElement,
              });
              continue;
            }

            if (findUserCloudkMachine.autoCompound === false) {
              console.log('🔄 Updating auto compound setting for machine:', {
                machineId: findUserCloudkMachine._id,
                machineName: findUserCloudkMachine.name,
                previousAutoCompound: findUserCloudkMachine.autoCompound,
              });

              findUserCloudkMachine.autoCompound = true;
              await findUserCloudkMachine.save();

              console.log(
                '✅ Successfully updated machine auto compound setting:',
                {
                  machineId: findUserCloudkMachine._id,
                  machineName: findUserCloudkMachine.name,
                  newAutoCompound: findUserCloudkMachine.autoCompound,
                },
              );
            } else {
              console.log('ℹ️ Machine already has auto compound enabled:', {
                machineId: findUserCloudkMachine._id,
                machineName: findUserCloudkMachine.name,
              });
            }
          }
        } else {
          console.warn('⚠️ No machines found for CloudK setting:', {
            settingId: element._id,
          });
        }

        console.log('📝 Setting CloudK setting status to inactive:', {
          settingId: element._id,
        });
        element.status = STATUS_TYPE.INACTIVE;
        element.deletedAt = deletedAt;
        await element.save();

        if (element.globalAutoCompoundEnabled) {
          console.log('�� Updating global auto compound setting:', {
            settingId: element._id,
          });
          const findGlobalAutoCompound =
            await CloudKGlobalAutoCompoundModel.findOne({
              user: element.user,
              deletedAt: null,
            });

          if (findGlobalAutoCompound) {
            findGlobalAutoCompound.enabled = element.globalAutoCompoundEnabled;
            await findGlobalAutoCompound.save();

            console.log(
              '�� Successfully updated global auto compound setting:',
              {
                settingId: findGlobalAutoCompound._id,
                newGlobalAutoCompoundStatus: findGlobalAutoCompound.enabled,
              },
            );
          } else {
            console.warn('���️ Global auto compound not found:', {
              settingId: element._id,
            });
          }
        }
        console.log('✅ Completed processing CloudK setting:', {
          settingId: element._id,
          processedMachines: element.machines?.length || 0,
          newStatus: 'inactive',
        });
      }
    } else {
      console.log('ℹ️ No active CloudK settings found');
    }

    console.log('\n🎉 Script execution completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error during script execution:', {
      errorMessage: error.message,
      errorStack: error.stack,
      timestamp: new Date().toISOString(),
    });
    process.exit(1);
  }
}

bootstrap().catch((err) => {
  console.error('❌ Unhandled error in bootstrap:', {
    errorMessage: err.message,
    errorStack: err.stack,
    timestamp: new Date().toISOString(),
  });
  process.exit(1);
});
