import { ConsoleLogger, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TokenService } from '../token/token.service';
import { CloudKRewardService } from '../cloud-k/cloudk-reward.service';
import { Worker } from 'worker_threads';
import { CloudKService } from '../cloud-k/cloud-k.service';
import { BuilderReferralService } from '../supernode/builder-referral.service';
import { ConfigService } from '@nestjs/config';
import { AdminService } from '../admin/admin.service';
import { InjectModel } from '@nestjs/mongoose';
import { UserGask } from '../supernode/schemas/user-gask.schema';
import { UsersService } from '../users/users.service';
import {
  ScenarioAnalyticsPointType,
  StatusAnalyticsPointType,
} from '../users/dto/update.analytics.dto';
import { Model, Types } from 'mongoose';
import { SupernodeService } from '../supernode/supernode.service';
import { SupernodeSummaryService } from '../supernode/supernode.summary.service';
import { WallekStake } from '../wallek-stake/schemas/wallek-stake.schema';
import { CacheService } from '../cache/cache.service';
import { CACHE_TYPE } from '../cache/Enums/cache.enum';
import { KMallService } from '../k-mall/kmall.service';
import { readObject, writeObject } from '../utils/common/upload.files';
import { TwoAccessService } from '../two-access/two-access.service';
import { WebhookUploadRewardFile } from '../webhook/schemas/webhookUploadRewardFile';
import { BullmqService } from '../bullmq/bullmq.service';
import { CloudKRewardGenerationType } from '../cloud-k/interfaces/cloudk-reward.interface';
import { CloudKReward } from '../cloud-k/schemas/cloudk-reward.schema';
import { QueueNames } from '../bullmq/enums/queue-names.enum';
import { AdminSupernodeService } from '../supernode/admin.supernode.service';
import { In } from 'typeorm';
import { TBalanceService } from '../t-balance/t-balance.service';
import { exit } from 'process';
import { UsdkStakeRewardService } from '../usdk-stake/usdk-stake-reward.service';

require('dotenv').config();

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private tokenService: TokenService,
    private adminService: AdminService,
    private cloudkService: CloudKService,
    private cloudkRewardService: CloudKRewardService,
    private builderReferralService: BuilderReferralService,
    private supernodeService: SupernodeService,
    private cacheService: CacheService,
    private readonly kmallService: KMallService,
    private bullmqService: BullmqService,
    private readonly tBalanceService: TBalanceService,
    private userServices: UsersService,
    private twoAccessService: TwoAccessService,
    private adminSupernodeService: AdminSupernodeService,

    private readonly usdkStakeRewardService: UsdkStakeRewardService,

    private configService: ConfigService,
    @InjectModel(UserGask.name)
    private userGaskModel: Model<UserGask>,

    @InjectModel(WallekStake.name)
    private readonly wallekStakeModel: Model<WallekStake>,

    @InjectModel(WebhookUploadRewardFile.name)
    private WebhookUploadRewardFileModel: Model<WebhookUploadRewardFile>,

    @InjectModel(CloudKReward.name)
    private cloudKReward: Model<CloudKReward>,
  ) {}

  @Cron(CronExpression.EVERY_2_HOURS, { name: 'update-lyk-ath' }) // will run every 2 hours
  updateLYKATH() {
    this.tokenService.setTokenOnChainDayATHPrice();
  }

  // @Cron(process.env.USER_IMPORT_SCHEDULE || CronExpression.EVERY_DAY_AT_11PM, {
  //   name: 'import-users-schedule',
  // })

  async runUserImport(bids: string[] | null = null) {
    const CHUNK_SIZE = 10000; // Define the chunk size
    const PAGE_SIZE = 100000; // Define the page size for pagination

    console.log('User import script started');

    const startTime = Date.now(); // Record the start time

    let offset = 0;
    let hasMoreData = true;
    let totalRecords = 0;

    // Remove all records only if bids is null
    if (bids === null) {
      await this.userServices.removeAllTreeUsers();
    }
    while (hasMoreData) {
      const userHierarchy = await this.twoAccessService.getUserHierarchy(
        PAGE_SIZE,
        offset,
        bids,
      );
      console.log('userHierarchy :>> ', userHierarchy);
      totalRecords += userHierarchy.length;

      if (userHierarchy.length < PAGE_SIZE) {
        hasMoreData = false;
      }

      const chunks = [];
      for (let i = 0; i < userHierarchy.length; i += CHUNK_SIZE) {
        chunks.push(userHierarchy.slice(i, i + CHUNK_SIZE));
      }

      const workerPromises = chunks.map((chunk) => {
        return new Promise((resolve, reject) => {
          const worker = new Worker(
            './dist/src/tasks/import-user.worker-v2.js',
            {
              workerData: chunk,
            },
          );

          worker.on('message', (message) => {
            if (message.status === 'done') {
              resolve(message.result);
            } else {
              reject(new Error(message.message));
            }
          });

          worker.on('error', (error) => {
            console.log('error', error);
            reject(error);
          });
        });
      });

      const results = await Promise.all(workerPromises);
      console.log('Chunks processed successfully.');

      offset += PAGE_SIZE;
    }

    // Delete cache entries after processing
    const deleteCacheResult =
      await this.cacheService.deleteCacheUserWithPattern(
        CACHE_TYPE.IMPORT_USER,
      );
    console.log(deleteCacheResult.message);

    const endTime = Date.now(); // Record the end time
    const timeTaken = (endTime - startTime) / 1000; // Calculate the time taken in seconds
    console.log('All processed successfully');
    console.log(`Total records processed: ${totalRecords}`);
    console.log(`Total time taken: ${timeTaken} seconds`);
  }

  // @Cron(process.env.USER_IMPORT_SCHEDULE || CronExpression.EVERY_DAY_AT_11PM, {
  //   name: 'import-users-schedule',
  // })

  // async runUserImport() {
  //   const userChunks = await this.cloudkService.getExportUserList();
  //   const workerPromises = userChunks.map((chunk) =>
  //     this.runUsersWorker(chunk),
  //   );

  //   const results = await Promise.all(workerPromises);

  //   this.logger.log('All chunks processed:', results);
  // }

  async runUsersWorker(chunk: any) {
    return new Promise((resolve, reject) => {
      const worker = new Worker('./dist/src/tasks/import-user.worker.js', {
        workerData: chunk,
      });

      worker.on('message', (message) => {
        if (message.status === 'done') {
          resolve(message.result);
        } else {
          reject(new Error(message.message));
        }
      });
      worker.on('error', (error) => console.log('error', error));
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM, { name: 'run-rewards-schedule' })
  async runRewards(bid = null, price = 0) {
    const machineChunksQueries = await this.getMachineChunksQueries();
    console.log('machineChunksQueries', machineChunksQueries);
    const workerPromises = machineChunksQueries.map((query) =>
      this.runNodekWorker(query, bid, price),
    );
    await Promise.all(workerPromises);

    // if (bid != null && bid) {
    //   return false;
    // }
    // await this,this.cloudkRewardService.generateTeamReward();

    console.log('Starting user active production...');
    // await this.processSuperNodeRewards(bid);
    // await this.supernodeService.userActiveProducation();
    console.log('User active production completed.');

    console.log('Starting super node reward generation...');
    // await this.cloudkRewardService.generateSuperNodeReward(bid);
    console.log('Super node reward generation completed.');

    //TODO : Temporary disabled. Should be enabled after testing.
    //dawait this.supernodeService.userActiveSuperNode();
    // builder regeration start
    // await this.supernodeService.userActiveSuperNode();

    // Delete cache after userActiveSuperNode

    // await this.cacheService.deleteCacheUserWithPattern(
    //   CACHE_TYPE.LEADERBOARD_DATA,
    // );
    // await this.cacheService.deleteCacheUserWithPattern(
    //   CACHE_TYPE.LEADERS_DATA_BY_TYPE,
    // );
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM, {
    name: 'import-user-hierarchy-to-redis',
  })
  async AddUserHierarchyToRedis() {
    const MembershipLimit = 25;
    const NoMembershipLimit = 100000;
    const maxRecordsMembership = Infinity;
    const maxRecordsNoMembership = Infinity;
    let MembershipOffset = 0;
    let NoMembershipOffset = 0;
    const startTime = Date.now();
    let totalProcessedMembership = 0;
    let totalProcessedNoMembership = 0;

    await this.cacheService.deleteCacheUserWithPattern(
      CACHE_TYPE.USER_HIERARCHY,
    );

    // Process records with membership set to false
    while (true) {
      const batchStartTime = Date.now(); // Start time for the batch
      console.log(
        'processing batch with offset (membership false): ',
        NoMembershipOffset,
      );
      const userHierarchy =
        await this.twoAccessService.getUserHierarchyPaginated(
          NoMembershipLimit,
          NoMembershipOffset,
          false,
        );

      if (!Array.isArray(userHierarchy)) {
        console.error('Error: userHierarchy is not an array');
        break;
      }

      if (
        userHierarchy.length === 0 ||
        totalProcessedNoMembership >= maxRecordsNoMembership
      ) {
        break;
      }

      const cachePromises = userHierarchy.map(async (user) => {
        if (user && user.id) {
          try {
            await this.cacheService.setCacheUser(
              {
                type: CACHE_TYPE.USER_HIERARCHY,
                user: user.id,
                data: user,
              },
              Infinity,
            );
          } catch (error) {
            console.error(`Error setting cache for user ${user.id}:`, error);
          }
        } else {
          console.warn(
            `Skipping user with undefined id: ${JSON.stringify(user)}`,
          );
        }
      });

      await Promise.all(cachePromises);

      totalProcessedNoMembership += userHierarchy.length;

      const batchEndTime = Date.now(); // End time for the batch
      const batchTimeTaken = (batchEndTime - batchStartTime) / 1000;
      console.log(`Batch processed in ${batchTimeTaken} seconds`);

      NoMembershipOffset += NoMembershipLimit;
    }

    // Process records with membership set to true
    while (true) {
      const batchStartTime = Date.now(); // Start time for the batch
      console.log(
        'processing batch with offset (membership true): ',
        MembershipOffset,
      );

      const userHierarchy =
        await this.twoAccessService.getUserHierarchyPaginated(
          MembershipLimit,
          MembershipOffset,
          true,
        );

      if (!Array.isArray(userHierarchy)) {
        console.error('Error: userHierarchy is not an array');
        break;
      }

      if (
        userHierarchy.length === 0 ||
        totalProcessedMembership >= maxRecordsMembership
      ) {
        break;
      }

      const cachePromises = userHierarchy.map(async (user) => {
        if (user && user.id) {
          try {
            await this.cacheService.setCacheUser(
              {
                type: CACHE_TYPE.USER_HIERARCHY,
                user: user.id,
                data: user,
              },
              Infinity,
            );
          } catch (error) {
            console.error(`Error setting cache for user ${user.id}:`, error);
          }
        } else {
          console.warn(
            `Skipping user with undefined id: ${JSON.stringify(user)}`,
          );
        }
      });

      await Promise.all(cachePromises);

      totalProcessedMembership += userHierarchy.length;

      const batchEndTime = Date.now(); // End time for the batch
      const batchTimeTaken = (batchEndTime - batchStartTime) / 1000;
      console.log(`Batch processed in ${batchTimeTaken} seconds`);

      MembershipOffset += MembershipLimit;
    }

    console.log('Finished processing all batches');
    const endTime = Date.now();
    const totalTimeTaken = (endTime - startTime) / 1000;
    console.log(
      `Processed ${totalProcessedMembership + totalProcessedNoMembership} records and added to Redis in ${totalTimeTaken} seconds`,
    );
  }

  async processSuperNodeRewards(bid?: string) {
    // const data = await this.AddUserHierarchyToRedis();
    // bid = '8000027156';
    console.log('Starting addDailyRewardsToQueue...');
    // return;
    const startTime = Date.now();

    // Delete base refferal cache entries after processing
    await this.cacheService.deleteCacheUserWithPattern(
      CACHE_TYPE.ACTIVE_BR_USER_ELIGIBLE,
    );

    // Delete nuilder generation highest machine cache entries after processing
    await this.cacheService.deleteCacheUserWithPattern(
      CACHE_TYPE.BG_USER_HIGEST_MACHINE,
    );

    // const today = new Date('2025-03-13');
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const queryConditions: any = {
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      type: CloudKRewardGenerationType.REWARD,
      deletedAt: null,
      cloudKTransaction: { $ne: null },
      // user: new Types.ObjectId('67cba69a14c719d92233e6aa'),
    };

    if (bid) {
      const user = await this.userServices.findUserByBlockchainId(bid);
      if (!user) {
        console.log(`User not found for blockchain ID: ${bid}`);
        return;
      }
      queryConditions.user = new Types.ObjectId(user.id);
    }

    const baseReferralSettings =
      await this.adminSupernodeService.getBaseReferralSettings();

    const builderGenerationSettings =
      await this.supernodeService.getBuilderGenerationSettings();

    const totalCount = await this.cloudKReward.countDocuments(queryConditions);

    // const totalCount = 100;
    console.log(`Total rewards to process for job : ${totalCount}`);

    const limit = 1000;
    let skip = 0;
    const batchPromises = [];
    while (skip < totalCount) {
      console.log('Processing batch with skip:', skip);
      const rewardsBatchPromise = this.cloudKReward
        .find(queryConditions)
        .populate('user')
        .skip(skip)
        .limit(limit)
        .lean()
        .exec()
        .then((rewardsBatch) => {
          console.log(`Fetched ${rewardsBatch.length} rewards in batch`);
          const jobPromises = rewardsBatch.map((reward) =>
            this.bullmqService.addJob(QueueNames.REWARD_QUEUE, {
              reward,
              baseReferralSettings,
              builderGenerationSettings,
            }),
          );
          return Promise.all(jobPromises);
        });

      batchPromises.push(rewardsBatchPromise);
      skip += limit;
    }

    const { completed, failed, failedJobs } =
      await this.bullmqService.waitForJobsToComplete(
        QueueNames.REWARD_QUEUE,
        totalCount,
      );

    const endTime = Date.now();
    const totalTimeTaken = (endTime - startTime) / 1000;
    console.log(
      `All Supernode reward ${totalCount} generated in ${totalTimeTaken} seconds`,
    );
  }

  async getMachineChunksQueries() {
    return this.cloudkRewardService.getMachineChunksQuery();
  }

  async runNodekWorker(query, bid = null, price) {
    return new Promise<void>((resolve, reject) => {
      const worker = new Worker('./dist/src/tasks/runreward.worker.js', {
        workerData: { query: query, bid: bid, price: price },
      });

      worker.on('message', (message) => {
        this.logger.log(`Worker finished: ${message}`);
        resolve();
      });

      worker.on('error', (error) => {
        this.logger.error(`Worker error: ${error}`);
        reject(error);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          this.logger.error(`Worker stopped with exit code ${code}`);
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    });
  }

  @Cron(CronExpression.EVERY_HOUR, { name: 'create boost by every hour' })
  async handleHourlyBoostOverride() {
    // await this.overrideBoostModel.updateMany({ enabled: false });
    await this.cloudkService.updateOverBoost();
    const boostData = await this.getCurrentBoostForMachines();
    const createBoostDto = {
      startTime: new Date(),
      endTime: new Date(new Date().getTime() + 60 * 60 * 1000), // 1 hour later
      enabled: true,
      boost: boostData.boost,
    };
    await this.cloudkService.createBoostOverride(createBoostDto);
  }
  async getCurrentBoostForMachines() {
    const { inflation } =
      await this.cloudkService.getCurrentInflationRulesData();
    // const inflation = await this.inflationModel
    //   .findOne({})
    //   .sort({ createdAt: -1 })
    //   .select('name adminNote');
    const currentPrice = await this.cloudkService.getCurrentPrice();
    const tokenAth = await this.tokenService.getTokenOnChainDayATHPrice();
    const compareFromPrice = tokenAth;
    const didPriceFall = currentPrice.price < compareFromPrice;
    if (!didPriceFall) return { boost: 0 };
    const percentageFall = 1 - currentPrice.price / compareFromPrice;
    const ruleApplied =
      await this.cloudkService.getinfulationRulesByDropPercentage(
        inflation,
        percentageFall,
      );
    // const ruleApplied = await this.inflationRulesModel
    //   .find({
    //     inflation: inflation._id,
    //   })
    //   .sort({ dropPercentage: -1 })
    //   .findOne({
    //     dropPercentage: { $lte: percentageFall * 100 },
    //   });
    return {
      boost: ruleApplied ? ruleApplied.mintingBoost : 0,
    };
  }

  // @Cron(CronExpression.EVERY_3_HOURS, { name: 'update-user-analytics' })
  // async updateUserAnalytics() {
  //   const allUserAnalyticsData = await this.userServices.getAllUserAnalyticsLog(
  //     { isToday: true },
  //   );
  //   if (allUserAnalyticsData && allUserAnalyticsData.length > 0) {
  //     for (let index = 0; index < allUserAnalyticsData.length; index++) {
  //       const element: any = allUserAnalyticsData[index];
  //       if (element.scenario) {
  //         const updatedUserAnalytics =
  //           await this.userServices.updateSingleUserUpline(
  //             element.userId,
  //             element.scenario as ScenarioAnalyticsPointType,
  //           );
  //         if (updatedUserAnalytics.userId) {
  //           if (updatedUserAnalytics.Job) {
  //             element.status = StatusAnalyticsPointType.SUCCESS;
  //             element.note = updatedUserAnalytics.message;
  //             element.deletedAt = new Date();
  //             await this.userServices.updateUserAnalyticsLog(
  //               element._id,
  //               element,
  //             );
  //           } else {
  //             element.status = StatusAnalyticsPointType.FAILED;
  //             await this.userServices.updateUserAnalyticsLog(element._id, {
  //               note: updatedUserAnalytics.message,
  //             });
  //           }
  //         }
  //       }
  //     }
  //   } else {
  //     console.log('No data found');
  //   }
  // }

  // @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
  //   name: 'get-rewards-staked-user-machine',
  // })
  // async getRewardStakedUserMachine() {
  //   try {
  //     const res = await this.cloudkRewardService.getRewardStakedUserMachine();
  //     const fileName = this.extractFileName(res.path);
  //     const fileUploaded = await writeObject(fileName);
  //     const readUploadFileObj = await readObject(fileName);

  //     if (fileUploaded) {
  //       const response = await this.kmallService.uploadRewardFile(fileName);

  //       const newWebhook = new this.WebhookUploadRewardFileModel({
  //         startTime: new Date(),
  //         path: res.path,
  //         fileName: fileName,
  //         kmallUrl: readUploadFileObj,
  //         kmalluploadRewardFileResponse: response,
  //       });
  //       this.logger.log(
  //         `File ${fileName} uploaded successfully and processed by KMall service.`,
  //       );
  //       return await newWebhook.save();
  //     } else {
  //       this.logger.error(`Failed to upload file ${fileName}.`);
  //       throw new Error(`Failed to upload file ${fileName}.`);
  //     }
  //   } catch (error) {
  //     this.logger.error('Error in getRewardStakedUserMachine:', error);
  //     throw error;
  //   }
  // }

  private extractFileName(filePath: string): string {
    return filePath.replace(/\\/g, '/').split('/').pop();
  }

  // @Cron(CronExpression.EVERY_DAY_AT_2AM, { name: 'active-user-production' })
  // async updateActiveUserProduction() {
  //   // await this.overrideBoostModel.updateMany({ enabled: false });
  //   await this.supernodeService.userActiveProducation();
  // }
  // @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: 'active-user-supernode' })
  // async updateActiveUserSuperNode() {
  //   // await this.overrideBoostModel.updateMany({ enabled: false });
  //   await this.supernodeService.userActiveSuperNode();
  // }

  // @Cron(CronExpression.EVERY_HOUR, {
  //   name: 'run-back-up-db',
  // })
  // async createDBBackup() {
  //   const startTimestamp = new Date();
  //   let backupPath = '';
  //   let gzipPath = '';

  //   try {
  //     const startTime = startTimestamp.toISOString().replace(/[:.]/g, '-');
  //     const backupDir = this.configService.get<string>(
  //       'DB_BACKUP_DIR',
  //       './backups',
  //     );
  //     const dbName = this.configService.get<string>('DB_NAME');
  //     const dbUri = this.configService.get<string>('MONGODB_URI');

  //     if (!dbName || !dbUri) {
  //       throw new Error('Database configuration is missing');
  //     }

  //     await fs.promises.mkdir(backupDir, { recursive: true });

  //     backupPath = path.join(backupDir, `${dbName}-backup-${startTime}`);
  //     gzipPath = `${backupPath}.tar.gz`;

  //     const execAsync = promisify(exec);
  //     const command = `mongodump --uri="${dbUri}" --out="${backupPath}"`;

  //     await execAsync(command);

  //     // Create a tar.gz file
  //     const tarCommand = `tar -czf "${gzipPath}" -C "${path.dirname(backupPath)}" "${path.basename(backupPath)}"`;
  //     await execAsync(tarCommand);

  //     // Remove the original backup directory
  //     await fs.promises.rm(backupPath, { recursive: true, force: true });

  //     const endTimestamp = new Date();
  //     this.logger.log(
  //       `backup: ${path.basename(gzipPath) || `backup-${startTime}`} created successfully`,
  //     );
  //     await this.adminService.createDatabaseDumpLogs({
  //       name: path.basename(gzipPath) || `backup-${startTime}`,
  //       status: AdminDatabaseDumpCode.SUCCESS,
  //       startTime: startTimestamp,
  //       endTime: endTimestamp,
  //     });

  //     await this.rotateBackups(backupDir, 7); // Keep 7 most recent backups
  //   } catch (error) {
  //     await this.adminService.createDatabaseDumpLogs({
  //       name: gzipPath ? path.basename(gzipPath) : '',
  //       status: AdminDatabaseDumpCode.ERROR,
  //       startTime: startTimestamp,
  //       endTime: new Date(),
  //     });

  //     // Clean up any partial backups
  //     if (backupPath && fs.existsSync(backupPath)) {
  //       await fs.promises.rm(backupPath, { recursive: true, force: true });
  //     }
  //     if (gzipPath && fs.existsSync(gzipPath)) {
  //       await fs.promises.unlink(gzipPath);
  //     }

  //     throw error;
  //   }
  // }
  // private async rotateBackups(backupDir: string, keep: number) {
  //   const files = await fs.promises.readdir(backupDir);
  //   const backups = files
  //     .filter((file) => file.endsWith('.gz'))
  //     .map((file) => ({
  //       name: file,
  //       time: fs.statSync(path.join(backupDir, file)).mtime.getTime(),
  //     }))
  //     .sort((a, b) => b.time - a.time);

  //   for (const backup of backups.slice(keep)) {
  //     await fs.promises.unlink(path.join(backupDir, backup.name));
  //     this.adminService.updateDatabaseDumpLogs(backup.name);
  //     this.logger.log(`Deleted old backup: ${backup.name}`);
  //   }
  // }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'tBalanceExprotAndProcessing',
  })
  async tBalanceProcessing() {
    return await Promise.all([
      this.tBalanceService.swapTBalanceReport(),
      this.tBalanceService.processTbalance(),
    ]);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'run-usdk-rewards-schedule',
  })
  async runUsdkReward() {
    console.log('+++++++++ Reward Start +++++++++++++++++++');
    const data = await this.usdkStakeRewardService.usdkRewardGenerater();
    console.log('+++++++++ Reward ended +++++++++++++++++++');
    return data;
  }
}
