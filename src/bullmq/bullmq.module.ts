import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullmqService } from './bullmq.service';
import { QueueNames } from './enums/queue-names.enum';
import { QueueJobLog, QueueJobLogSchema } from './schemas/queue-job-log.schema';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD') || '',
          enableReadyCheck: true, // Ensures Redis is ready before accepting commands
          maxRetriesPerRequest: null, // Allows unlimited retries for Redis commands
          readOnly: false, // Explicitly declare this is a master connection
          scaleReads: 'master', // For Redis Cluster: ensure reads are directed to the master
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: QueueNames.REWARD_QUEUE,
      defaultJobOptions: {
        removeOnComplete: {
          age: 64800, // Keep completed jobs for 18 hour (in seconds)
        },
        removeOnFail: {
          age: 64800, // Keep failed jobs for 18 hour (in seconds)
        },
        attempts: 3, // Retry failed jobs up to 3 times
        backoff: {
          type: 'exponential',
          delay: 5000, // Retry after 5 seconds
        },
      },
    }),
    BullModule.registerQueue({
      name: QueueNames.USER_QUEUE,
      defaultJobOptions: {
        removeOnComplete: {
          age: 64800, // Keep completed jobs for 18 hour (in seconds)
        },
        removeOnFail: {
          age: 64800, // Keep failed jobs for 18 hour (in seconds)
        },
        attempts: 3, // Retry failed jobs up to 3 times
        backoff: {
          type: 'exponential',
          delay: 5000, // Retry after 5 seconds
        },
      },
    }),
    MongooseModule.forFeature([
      { name: QueueJobLog.name, schema: QueueJobLogSchema },
    ]),
  ],
  providers: [BullmqService],
  exports: [BullmqService],
})
export class BullmqModule {}
