import { ConfigService } from '@nestjs/config';

const configService = new ConfigService();
const queuePrefix =
  configService.get<string>('RAABITMQ_CONSUMER_PREFIX') ??
  Math.floor(Math.random()*10000);
export const generateTopicQueueNames = (exchange: string) =>
  `${queuePrefix}_queue_${exchange}`;
