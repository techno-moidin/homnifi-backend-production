import { Module } from '@nestjs/common';
import { MachineTrackingService } from './machine-tracking.service';
import { MachineTrackingController } from './machine-tracking.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  MachineTrack,
  MachineTrackSchema,
} from './schema/machine-tracking.schema';
import {
  CloudKMachine,
  CloudKMachineSchema,
} from '../cloud-k/schemas/cloudk-machine.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import {
  CloudKProduct,
  CloudKProductSchema,
} from '../cloud-k/schemas/cloudk-products.schema';
import {
  MachineSerialNumberDetails,
  MachineSerialNumberDetailsSchema,
} from './schema/machine-serialNumber-details.schema';

@Module({
  controllers: [MachineTrackingController],
  providers: [MachineTrackingService],
  imports: [
    MongooseModule.forFeature([
      { name: MachineTrack.name, schema: MachineTrackSchema },
      { name: CloudKMachine.name, schema: CloudKMachineSchema },
      { name: User.name, schema: UserSchema },
      { name: CloudKProduct.name, schema: CloudKProductSchema },

      {
        name: MachineSerialNumberDetails.name,
        schema: MachineSerialNumberDetailsSchema,
      },
    ]),
  ],
  exports: [MachineTrackingService],
})
export class MachineTrackingModule {}
