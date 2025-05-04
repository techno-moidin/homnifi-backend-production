export class RabbitMQEventStore {
  private static handlers = new Map<string, any>();

  static registerHandler(queueName: string, handler: any) {
    this.handlers.set(queueName, handler);
  }

  static getHandler(queueName: string): any | undefined {
    return this.handlers.get(queueName);
  }
}
