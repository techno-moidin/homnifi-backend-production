import { Injectable } from '@nestjs/common';
import { RabbitMQHandler } from './rabbitmq/decorator/rabbitmq-handler.decorator';
import { Payload } from '@nestjs/microservices';
import { RABBITMQ_TOPICS } from './utils/rabbitmq.constants';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  @RabbitMQHandler('log') // Listens for the "user.created" event
  handleUserCreated(@Payload() data: any) {
    console.log('Received event: to decorator', data);
  }

  @RabbitMQHandler(RABBITMQ_TOPICS.MACHINE_SYNC)
  machineSync(@Payload() data: any) {
    console.log('Received event: to machine', data);
  }

  @RabbitMQHandler(RABBITMQ_TOPICS.DATA_SYNC)
  dataSync(@Payload() data: any) {
    console.log('Received event: to data ', data);
  }
}
