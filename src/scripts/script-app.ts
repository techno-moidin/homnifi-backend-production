import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';

export default abstract class ScriptApp {
  protected app: any;

  constructor() {
    this.init().then(() => {
      this.finished();
    });
  }

  protected async init(): Promise<void> {
    ;
    await this.start();
  }

  protected async start() {
    this.app = await NestFactory.createApplicationContext(AppModule);
  }

  protected async finished(): Promise<void> {
    await this.app.close();
  }
}
