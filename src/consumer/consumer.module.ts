import { Module } from '@nestjs/common';
import { ConsumerService } from './consumer.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CloudKMachine,
  CloudKMachineSchema,
} from '../cloud-k/schemas/cloudk-machine.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CloudKMachine.name, schema: CloudKMachineSchema },
    ]),
  ],
  providers: [ConsumerService],
})
export class ConsumerModule {}
