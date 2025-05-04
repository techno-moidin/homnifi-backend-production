import { parentPort, workerData } from 'worker_threads';
import { CloudKRewardService } from '../cloud-k/cloudk-reward.service';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CloudKService } from '../cloud-k/cloud-k.service';
import { BuilderReferralService } from '../supernode/builder-referral.service';
import {
  CLOUDK_MACHINE_STATUS,
  CloudKMachine,
} from '../cloud-k/schemas/cloudk-machine.schema';
import { calculateTimeDifference } from '../utils/helpers';
import {
  CLOUDK_JOBS_STATUS,
  CloudKDailyJob,
} from '../cloud-k/schemas/cloudk-reward-job.schema';
import { Model, ObjectId, PipelineStage, Types } from 'mongoose';
import { SupernodeService } from '../supernode/supernode.service';
import { User } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { CacheService } from '../cache/cache.service';
import { CloudKProduct } from '../cloud-k/schemas/cloudk-products.schema';
import {
  CloudKadditionalMintingPowerDataInterface,
  CloudKRewardExcessDistributionInterface,
} from '../cloud-k/interfaces/cloudk-reward.interface';
import { CountriesService } from '../countries/countries.service';
import { AdditionalMintingPromotionStatus } from '../admin/schemas/additional-minting-promotion.schema';
import { countriesAllOptions } from '../countries/schemas/country.schema';

interface Machine {
  // Define the properties of the Machine object
  id: string;
  // Other properties...
}

interface PriceData {
  price: number;
  high: number;
  // Other properties...
}

const run = async () => {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const rewardService = appContext.get(CloudKRewardService);
  const cloudkService = appContext.get(CloudKService);
  const userService = appContext.get(UsersService);
  const countriesService = appContext.get(CountriesService);
  const superNodeGasKService = appContext.get(SupernodeService);
  const userModel = appContext.get<Model<User>>(User.name + 'Model');

  const builderReferralService = appContext.get(BuilderReferralService);
  const cacheService = appContext.get(CacheService);
  try {
    console.log('SCRIPT STARTED');

    // workerData contains the machine chunk passed from the main thread
    const currentKillServices = await cloudkService.getCurrentKillSettings();
    // Flush all redis cache
    // await cacheService.resetCache();

    const query = workerData;

    console.log({ workerData, query });
    let priceData: any = {};

    if (query?.price) {
      priceData = {
        price: query?.price,
      };
    } else {
      priceData = await cloudkService.getCurrentPrice();
    }

    console.log(query, '------query----------');

    let userID = null;
    if (query?.bid) {
      const userData = await userService.findUserByBlockchainId(query.bid);
      if (userData) userID = userData._id;
    }

    // const priceData = {
    //   price: priceData2?.price,
    // };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const queryConditions: any = {
      status: CLOUDK_MACHINE_STATUS.ACTIVE,
      endDate: { $gte: new Date() },
      startDate: { $lt: today },
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
    };
    if (userID) {
      queryConditions.user = userID; // Add user filter only if userID exists
    }
    // const machines = await cloudkService.machineModel
    //   .find({
    //     user: userID,
    //     status: CLOUDK_MACHINE_STATUS.ACTIVE,
    //     endDate: { $gte: new Date() },
    //     startDate: { $lt: today },
    //     $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
    //   })
    //   .skip((query.page - 1) * query.limit)
    //   .limit(query.limit);
    // const allCountries = await countriesService.getAllCountries();

    const allProductswithAdditionalMintingPower =
      await rewardService.getAdditionalMintingPowerValidator();
    console.log(
      allProductswithAdditionalMintingPower,
      ': allProductswithAdditionalMintingPower',
    );

    const productDetails = await rewardService.getAllProducts();

    const machines = await cloudkService.machineModel
      .find(queryConditions)
      .skip((query.page - 1) * query.limit)
      .limit(query.limit);

    const currentJob = await rewardService.getOrCreateCurrentJOb(
      machines.length,
      priceData.price,
    );
    const failedMachines = [];
    const IsAnyUpdatedIdArray: Array<CloudKRewardExcessDistributionInterface> =
      [];
    const multiplier = await superNodeGasKService.getsnGaskSettingMultiplier();
    if (currentKillServices?.rewardsJobEnabled) {
      for (const machine of machines) {
        try {
          // Fix the filter and map operations
          const user = await userModel
            .findById(machine.user)
            .select('_id document_country');
          console.log('machine :', machine);

          // Add additional minting power filter

          const newAdditionalMintingData =
            await rewardService.getCountryPercentageAdditionalMinting({
              promotionId:
                allProductswithAdditionalMintingPower[0]?._id || null,
              productId: machine.product as Types.ObjectId,
              countryCodeAlpha3:
                user?.document_country ?? countriesAllOptions.All, // or the appropriate country code
            });
          console.log(newAdditionalMintingData, 'newAdditionalMintingData');

          // Set Additional Minting Data
          const AdditionalMintingPowerData: CloudKadditionalMintingPowerDataInterface =
            newAdditionalMintingData.percentage > 0
              ? {
                  additionalMintingPowerStatus:
                    AdditionalMintingPromotionStatus.ACTIVE,
                  additionalMintingPowerId:
                    newAdditionalMintingData.promotionId?.toString() ?? null,
                  additionalMintingPowerPercentage:
                    newAdditionalMintingData.percentage ?? 0,
                  countryCodeAlpha3:
                    newAdditionalMintingData.countryCodeAlpha3 ??
                    countriesAllOptions.All,
                  additionalMintingCountryLevelId:
                    newAdditionalMintingData.additionalMintingCountryLevelId?.toString() ??
                    null,
                }
              : {
                  additionalMintingPowerStatus:
                    AdditionalMintingPromotionStatus.EXPIRED,
                  additionalMintingPowerId: null,
                  additionalMintingPowerPercentage: 0,
                  countryCodeAlpha3: null,
                  additionalMintingCountryLevelId: null,
                };
          // Set Gen Active Reward
          const matchedProduct = productDetails.find(
            (product) => machine.product?.toString() === product._id.toString(),
          );
          const genRewardData: {
            isGenActiveReward: boolean;
            genRewardPercentage: number;
            actveGenRewardPercentageId: string | null;
          } =
            matchedProduct && matchedProduct.genRewardPercentage > 0
              ? {
                  isGenActiveReward: true,
                  genRewardPercentage:
                    matchedProduct.genRewardPercentage > 0
                      ? matchedProduct.genRewardPercentage
                      : null,
                  actveGenRewardPercentageId:
                    matchedProduct.actveGenRewardPercentageId?.toString() ??
                    null,
                }
              : {
                  isGenActiveReward: false,
                  genRewardPercentage: 0,
                  actveGenRewardPercentageId: null,
                };
          console.log(AdditionalMintingPowerData, 'AdditionalMintingPowerData');
          console.log(genRewardData, 'genRewardData');

          const IsAnyUpdatedId = (await rewardService.generateReward({
            machine: machine as CloudKMachine,
            currentPrice: priceData.price,
            todaysJob: currentJob,
            rewardDate: new Date(),
            // Additional minting power
            additionalMintingPower: AdditionalMintingPowerData,
            // Gen Reward
            genRewardData: genRewardData,
            multiplier: multiplier,
          })) as CloudKRewardExcessDistributionInterface | null;
          if (IsAnyUpdatedId) {
            IsAnyUpdatedIdArray.push(IsAnyUpdatedId);
          }
          // Update Supernode Status
          if (machine.autoCompound) {
            if (user) {
              const [isBuilderGenerationActive, baseReferralStatus] =
                await Promise.all([
                  superNodeGasKService.isBuilderGenerationUserActiveNode(
                    machine.user,
                  ),
                  superNodeGasKService.baseRefereralUserActiveMachine(
                    machine.user,
                  ),
                ]);
              // user.isBuilderGenerationActive = isBuilderGenerationActive;
              // user.isBaseReferralActive = baseReferralStatus?.status ?? false;
              // await user.save();

              await userModel.findByIdAndUpdate(machine.user, {
                isBuilderGenerationActive: isBuilderGenerationActive,
                isBaseReferralActive: baseReferralStatus?.status ?? false,
              });
            }
          }
        } catch (error) {
          console.log({ error });
          failedMachines.push({
            machine: machine._id,
            error: JSON.stringify({
              message: error.message,
              stack: error.stack,
              name: error.name,
            }),
          });
        }
      }
      console.log(
        JSON.stringify(IsAnyUpdatedIdArray, null, 2),
        '----------------',
      );

      if (IsAnyUpdatedIdArray.length > 0) {
        for (let index = 0; index < IsAnyUpdatedIdArray.length; index++) {
          const element = IsAnyUpdatedIdArray[index];
          if (element.IsAnyUpdatedId && element.fromMachine) {
            try {
              await rewardService.ExcessRewardDistribution({
                IsAnyUpdatedId: element.IsAnyUpdatedId,
                fromMachine: element.fromMachine,
                fromMachineUniqueName: element.fromMachineUniqueName,
                fromMachineName: element.fromMachineName,
                collatoral: element.collatoral,
                todaysJob: element.todaysJob,
                tokenAmount: element.tokenAmount,
                rewardTokenPrice: element.rewardTokenPrice,

                token: element.token,
                stakeToken: element.stakeToken,
                currentReward_id: element.currentReward_id,
                user: element.user,
                lifetimeReward: element.lifetimeReward,
                claimableRewards: element.claimableRewards,
                multiplier: multiplier,
                currentPrice: element.currentPrice,
                // Active Gen Reward
                genActiveRewardTokens: element.genActiveRewardTokens,
                isGenActiveReward: element.isGenActiveReward,
                actveGenRewardId: element.actveGenRewardId,
                genRewardPercentage: element.genRewardPercentage,
                // Additional Minting Power
                UpdatedAdditionalrewardTokens:
                  element.UpdatedAdditionalrewardTokens,
                additionalMintingRewardId: element.additionalMintingRewardId,
                additionalMintingPowerPercentage:
                  element.additionalMintingPowerPercentage,
                isAdditionalMintingPower: element.isAdditionalMintingPower,
              });
            } catch (error) {
              failedMachines.push({
                machine: element.IsAnyUpdatedId,
                error: JSON.stringify({
                  message: error?.message || 'some error',
                  stack: error?.stack || 'some error',
                  name: error?.name || 'some error',
                }),
              });
            }
          }
        }
      }
    }
    console.log('-------------REWARD GENERATION DONE----------------------');
    if (!currentKillServices.rewardsJobEnabled) {
      currentJob.status = CLOUDK_JOBS_STATUS.NOT_INITIATED;
    } else if (failedMachines.length > 0) {
      currentJob.error = JSON.stringify(failedMachines);
      currentJob.status = CLOUDK_JOBS_STATUS.PARTIAL_SUCCESS;
    } else {
      currentJob.status = CLOUDK_JOBS_STATUS.SUCCESS;
    }
    currentJob.endTime = new Date();
    const timeTaken = calculateTimeDifference(
      currentJob.startTime,
      currentJob.endTime,
    );
    currentJob.timeTaken = timeTaken;
    await currentJob.save();

    // Notify the main thread that processing is complete

    parentPort?.postMessage('done');
    process.exit(0);
  } catch (error) {
    console.log(error, 'error');

    parentPort?.postMessage(`error: ${error.message}`);
    process.exit(1);
  }
};

run();
