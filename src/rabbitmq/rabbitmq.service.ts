import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, { Channel, ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel } from 'amqplib';

export const QUEUE_OPTIONS = {
  durable: true, // Make the queue durable
  exclusive: false, // Not exclusive
  autoDelete: false, // Don't auto-delete the queue
  // arguments: {
  //   'x-message-ttl': 30000, // Message TTL of 30 seconds
  //   'x-max-length': 1000, // Maximum queue length of 1000 messages
  // },
};
@Injectable()
export class RabbitmqService {
  private channelWrapper: ChannelWrapper;
  constructor() {
    const configService = new ConfigService();

    const connection = amqp.connect([
      configService.get<string>('RABBITMQ_URL') ?? 'amqp://localhost',
    ]);
    this.channelWrapper = connection.createChannel();
  }

  async emit(pattern: string, payload: any) {
    await this.createQueue(pattern);
    console.log('sending to queue');
    await this.channelWrapper.sendToQueue(
      pattern,
      Buffer.from(JSON.stringify({ content: payload })),
    );
  }

  publish(exchange: string, routingKey: string, content: any) {
    this.channelWrapper.assertExchange(exchange, 'topic', {
      durable: false,
    });
    console.log('exchangin');
    this.channelWrapper.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify({ content: content })),
    );
  }

  async createQueue(queueName) {
    try {
      await this.channelWrapper.assertQueue(queueName, QUEUE_OPTIONS);
    } catch (error) {
      console.error('Error creating queue:', error);
    }
  }
}
