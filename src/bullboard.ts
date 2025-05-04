import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { createBullBoard } from '@bull-board/api';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bullmq';
import express from 'express';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueNames } from './bullmq/enums/queue-names.enum';
import { isMainThread } from 'worker_threads';

@Injectable()
export class BullBoardService implements OnModuleInit {
  private queues: Queue[];

  constructor(
    @InjectQueue(QueueNames.REWARD_QUEUE) private readonly rewardQueue: Queue,
    @InjectQueue(QueueNames.USER_QUEUE) private readonly userQueue: Queue,
    private readonly configService: ConfigService,
  ) {
    this.queues = [this.rewardQueue, this.userQueue];
  }

  onModuleInit() {
    // Ensure this only runs in the main thread
    if (!isMainThread) {
      console.log(
        'BullBoardService: Skipping initialization in worker thread.',
      );
      return;
    }
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/admin/queues');

    createBullBoard({
      queues: this.queues.map((queue) => new BullMQAdapter(queue)),
      serverAdapter,
    });

    const app = express();
    app.use('/admin/queues', serverAdapter.getRouter());

    const port = this.configService.get<number>('BULLBOARD_PORT', 3002);
    const host = this.configService.get<string>('BULLBOARD_HOST', 'localhost');

    app.listen(port, host, () => {
      console.log(`BullBoard is running on ${host}:${port}/admin/queues`);
    });
  }
}
