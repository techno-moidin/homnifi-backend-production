import { Global, Module } from '@nestjs/common';
import { RabbitmqService } from './rabbitmq.service';
import { RabbitmqConsumerService } from './rabbitmq-consumer.service';
import { RabbitmqController } from './rabbitmq.controller';

@Global()
@Module({
  providers: [RabbitmqService, RabbitmqConsumerService],
  controllers: [RabbitmqController],
  exports: [RabbitmqService, RabbitmqConsumerService],
})
export class RabbitmqModule {}
