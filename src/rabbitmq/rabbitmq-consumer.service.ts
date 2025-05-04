import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleInit,
} from '@nestjs/common';
import amqp, { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { EmailService } from '../email/email.service';
import { generateTopicQueueNames } from './rabbitmq.store';
import { RABBITMQ_EXCHANGES } from '../utils/rabbitmq.constants';
import { ConfigService } from '@nestjs/config';
import { RabbitMQEventStore } from './decorator/rabbitmq-event.store';
import { ModulesContainer, Reflector } from '@nestjs/core';
import { RABBITMQ_HANDLER_METADATA } from './decorator/rabbitmq-handler.decorator';

@Injectable()
export class RabbitmqConsumerService implements OnApplicationBootstrap {
  private channelWrapper: ChannelWrapper;
  private readonly logger = new Logger(RabbitmqConsumerService.name);
  constructor(
    private readonly modulesContainer: ModulesContainer,
    private readonly reflector: Reflector,
  ) {
    const configService = new ConfigService();
    const connection = amqp.connect([
      configService.get<string>('RABBITMQ_URL') ?? 'amqp://localhost',
    ]);
    this.channelWrapper = connection.createChannel();
  }
  async onApplicationBootstrap() {
    this.registerHandlers();

    await this.channelWrapper.addSetup(async (channel: ConfirmChannel) => {
      // // 1. **Set up direct queues**
      // iterate all handlers registered and get the topic name
      for (const [topic, handler] of RabbitMQEventStore['handlers']) {
        await channel.assertExchange(
          RABBITMQ_EXCHANGES.DATA_EXCHANGE,
          'topic',
          {
            durable: false,
          },
        );
        const queueName = generateTopicQueueNames(
          RABBITMQ_EXCHANGES.DATA_EXCHANGE,
        );
        const q = await channel.assertQueue(queueName, { exclusive: false });
        await channel.bindQueue(
          q.queue,
          RABBITMQ_EXCHANGES.DATA_EXCHANGE,
          topic,
        );
        await this.consumeQueue(channel, q.queue);
      }
    });
  }

  private registerHandlers() {
    // get all modules from container
    for (const [__, moduleRef] of this.modulesContainer.entries()) {
      // iterate through each module and get their providers
      for (const [_, provider] of moduleRef.providers) {
        const instance = provider.instance;
        // get provider instance
        if (!instance) continue;
        // get handlers based on rabbitmQmetadata
        const handlers =
          this.reflector.get(RABBITMQ_HANDLER_METADATA, instance.constructor) ||
          [];
        if (handlers.length > 0) {
          handlers.forEach(({ queueName, method }) => {
            // store all handlers with topicname in rabbitmq store
            RabbitMQEventStore.registerHandler(
              queueName,
              instance[method].bind(instance),
            );
          });
        }
      }
    }
  }
  async consumeQueue(channel: ConfirmChannel, queue: string, isTopic = false) {
    await channel.consume(queue, async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      try {
        const msgData = JSON.parse(msg.content.toString());
        const routingKey = msg.fields.routingKey;
        console.log({ routingKey, queue });
        this.logger.log(`Received message from queue: ${queue}`);

        const handler = RabbitMQEventStore.getHandler(routingKey);
        if (handler) {
          await handler(msgData);
        } else {
          this.logger.warn(`No handler found for queue: ${routingKey}`);
        }

        channel.ack(msg); // Acknowledge message
      } catch (error) {
        this.logger.error(
          `Error processing message from queue ${queue}:`,
          error,
        );
        channel.nack(msg, false, false); // Reject message
      }
    });
  }
}
