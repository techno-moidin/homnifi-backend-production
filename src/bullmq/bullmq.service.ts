import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
import { QueueNames } from './enums/queue-names.enum';
import { QueueJobLog } from './schemas/queue-job-log.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { QueueJobStatus } from './enums/queue-job-status.enum';

@Injectable()
export class BullmqService {
  constructor(
    @InjectQueue(QueueNames.REWARD_QUEUE) private readonly rewardQueue: Queue,
    @InjectQueue(QueueNames.USER_QUEUE) private readonly userQueue: Queue,
    @InjectModel(QueueJobLog.name)
    private readonly queueJobLogModel: Model<QueueJobLog>,
  ) {}

  async addJob(queueName: QueueNames, data: any) {
    const queue = this.getQueue(queueName);
    await queue.add(`${queueName}-job`, data);
  }

  async addJobs(queueName: QueueNames, data: any[]) {
    const queue = this.getQueue(queueName);
    await queue.addBulk(
      data.map((d) => ({ name: `${queueName}-job`, data: d })),
    );
  }

  private getQueue(queueName: QueueNames): Queue {
    switch (queueName) {
      case QueueNames.REWARD_QUEUE:
        return this.rewardQueue;
      case QueueNames.USER_QUEUE:
        return this.userQueue;
      default:
        throw new Error(`Queue ${queueName} not found`);
    }
  }

  async getJobFromQueue(queueName: QueueNames, jobId: string) {
    const queue = this.getQueue(queueName);
    return await queue.getJob(jobId);
  }

  async waitForJobsToComplete(
    queueName: QueueNames,
    totalJobs: number,
  ): Promise<{ completed: number; failed: number; failedJobs: any[] }> {
    const queueEvents = new QueueEvents(queueName);
    let completedJobs = 0;
    let failedJobs = 0;
    const failedJobDetails = [];

    return new Promise((resolve) => {
      queueEvents.on('completed', () => {
        completedJobs++;
        if (completedJobs + failedJobs === totalJobs) {
          queueEvents.close(); // Close the event listener
          resolve({
            completed: completedJobs,
            failed: failedJobs,
            failedJobs: failedJobDetails,
          });
        }
      });

      queueEvents.on('failed', (jobId, err) => {
        failedJobs++;
        failedJobDetails.push({ jobId, error: err });
        if (completedJobs + failedJobs === totalJobs) {
          queueEvents.close(); // Close the event listener
          resolve({
            completed: completedJobs,
            failed: failedJobs,
            failedJobs: failedJobDetails,
          });
        }
      });
    });
  }

  async logQueueJob(
    queueName: string,
    jobId: string,
    status: QueueJobStatus,
    jobData: Record<string, any>,
    errorMessage?: string,
    stackTrace?: string,
  ): Promise<void> {
    const jobLog = new this.queueJobLogModel({
      queueName,
      jobId,
      status,
      errorMessage,
      stackTrace,
      jobData,
    });
    await jobLog.save();
  }
}
