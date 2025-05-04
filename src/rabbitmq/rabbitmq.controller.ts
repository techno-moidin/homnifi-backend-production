import { Controller, Get } from '@nestjs/common';
import { RabbitmqService } from './rabbitmq.service';
import {
  RABBITMQ_EXCHANGES,
  RABBITMQ_TOPICS,
} from '../utils/rabbitmq.constants';
import { EventPattern, Payload } from '@nestjs/microservices';
import { RabbitMQHandler } from './decorator/rabbitmq-handler.decorator';

@Controller('rabbitmq')
export class RabbitmqController {
  constructor(private readonly rabbitMqProducerService: RabbitmqService) {}
  @Get('direct')
  direct() {
    console.log('direct emiting');
    this.rabbitMqProducerService.emit('log', {
      message: 'hai data sync',
    });
    return { message: 'success' };
  }

  @Get('topic')
  topicBase() {
    this.rabbitMqProducerService.publish(
      RABBITMQ_EXCHANGES.DATA_EXCHANGE,
      'log2',
      {
        message: 'hai notif log 2 topic',
      },
    );
    return { message: 'success' };
  }

  @Get('topic2')
  topicBase2() {
    this.rabbitMqProducerService.publish(
      RABBITMQ_EXCHANGES.DATA_EXCHANGE,
      RABBITMQ_TOPICS.MACHINE_SYNC,
      {
        message: 'hai machine sync',
      },
    );
    return { message: 'success' };
  }


  @Get('topic3')
  topicBase3() {
    this.rabbitMqProducerService.publish(
      RABBITMQ_EXCHANGES.DATA_EXCHANGE,
      RABBITMQ_TOPICS.DATA_SYNC,
      {
        message: 'hai data sync',
      },
    );
    return { message: 'success' };
  }
 
}
