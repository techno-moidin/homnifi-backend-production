import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Job } from 'bullmq';
import { CloudKReward } from '../cloud-k/schemas/cloudk-reward.schema';
import { BaseReferralRewardService } from '../supernode/base-referral-generate.service';
import { QueueNames } from '../bullmq/enums/queue-names.enum';
import { BuilderGenerationalRewardService } from '../supernode/builder-generation.service';
import { TwoAccessService } from '../two-access/two-access.service';
import { UsersService } from '../users/users.service';
import { exit } from 'process';
import { CacheService } from '../cache/cache.service';
import { CACHE_TYPE } from '../cache/Enums/cache.enum';
import { CloudKRewardService } from '../cloud-k/cloudk-reward.service';
import { BullmqService } from '../bullmq/bullmq.service';
import { QueueJobStatus } from '../bullmq/enums/queue-job-status.enum';

@Processor(QueueNames.REWARD_QUEUE, {
  concurrency: 100,
  lockDuration: 1800000,
  drainDelay: 5000,
})
export class RewardProcessor extends WorkerHost {
  constructor(
    @InjectModel(CloudKReward.name)
    private readonly cloudKReward: Model<CloudKReward>,
    private readonly baseReferralRewardService: BaseReferralRewardService,
    private readonly builderGenerationRewardService: BuilderGenerationalRewardService,
    private readonly twoAccessService: TwoAccessService,
    private readonly userService: UsersService,
    private cacheService: CacheService,
    private cloudkRewardService: CloudKRewardService,
    private readonly bullmqService: BullmqService,
  ) {
    super();
  }
  async process(job: Job<any>): Promise<any> {
    const { reward, baseReferralSettings, builderGenerationSettings } =
      job.data;
    console.log(`Processing job ${job.id}`);
    const startTime = Date.now();

    try {
      // Check if the job still exists in Redis
      const jobExists = await this.bullmqService.getJobFromQueue(
        QueueNames.REWARD_QUEUE,
        job.id,
      );
      if (!jobExists) {
        console.warn(`Job ${job.id} is missing in Redis, skipping processing.`);
        throw new Error(`Job ${job.id} is missing in Redis.`);
      }
      if (!reward.user) {
        console.log(`User not found for ${reward._id}`);
        throw new Error(`User not found for reward ID ${reward._id}`);
      }
      let userHierarchyData = await this.cacheService.getCacheUser({
        type: CACHE_TYPE.USER_HIERARCHY,
        user: reward?.user?.blockchainId,
      });

      if (!userHierarchyData) {
        userHierarchyData = await this.twoAccessService.getUserHierarchyByBid(
          reward?.user?.blockchainId,
        );
        if (userHierarchyData?.id) {
          await this.cacheService.setCacheUser(
            {
              type: CACHE_TYPE.USER_HIERARCHY,
              user: userHierarchyData?.id,
              data: userHierarchyData,
            },
            Infinity,
          );
        }
        console.log('NOT From Cache', userHierarchyData?.id);
      }

      if (!userHierarchyData) {
        // cache user hierarchy data
        console.log(
          `User hierarchy data not found for user ${reward.user.blockchainId} in job ${job.id}`,
        );
        await this.cloudkRewardService.logErrorsToJob(
          reward?.job,
          `User hierarchy data not found for user ${reward.user.blockchainId} in job ${job.id}`,
        );
        return;
      }

      await Promise.all([
        this.baseReferralRewardService.generateBaseReferralReward(
          reward,
          baseReferralSettings,
          userHierarchyData,
        ),
        this.builderGenerationRewardService.generateBuilderGenerationReward(
          reward,
          builderGenerationSettings,
          userHierarchyData,
        ),
      ]);
    } catch (error) {
      // Centralized error logging
      console.error(`Error processing job ${job.id}:`, error);
      await this.bullmqService.logQueueJob(
        QueueNames.REWARD_QUEUE,
        job.id,
        QueueJobStatus.FAILED, // Use the enum for status
        job.data?.reward,
        error.message,
        error.stack,
      );
      throw error;
    } finally {
      // Log execution time
      const endTime = Date.now();
      const executionTime = (endTime - startTime) / 1000;
      console.log(`Job ${job.id} processed in ${executionTime} seconds`);
    }
  }
}
