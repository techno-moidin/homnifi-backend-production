import { SetMetadata } from '@nestjs/common';

export const RABBITMQ_HANDLER_METADATA = 'RABBITMQ_HANDLER_METADATA';

export function RabbitMQHandler(queueName: string): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    const existingHandlers =
      Reflect.getMetadata(RABBITMQ_HANDLER_METADATA, target.constructor) || [];
    const updatedHandlers = [
      ...existingHandlers,
      { queueName, method: propertyKey },
    ];
    Reflect.defineMetadata(
      RABBITMQ_HANDLER_METADATA,
      updatedHandlers,
      target.constructor,
    );
  };
}
