import { Injectable } from '@nestjs/common';
import { Payload } from '@nestjs/microservices';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import mongoose, { Connection, Model, Types } from 'mongoose';
import { RabbitMQHandler } from '../rabbitmq/decorator/rabbitmq-handler.decorator';
import {
  CLOUDK_MACHINE_STATUS,
  CloudKMachine,
} from '../cloud-k/schemas/cloudk-machine.schema';
import { MessageUpdatedDto } from './dto/machine.status.dto';
import { MAHCINE_CONNECTION_STATUS } from '../machine-tracking/schema/machine-tracking.schema';

@Injectable()
export class ConsumerService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(CloudKMachine.name)
    private machineModel: Model<CloudKMachine>,
  ) {}
  @RabbitMQHandler('user.update.machine.active') // listern when machine is connect with serial number
  async handleUserStatusOfMachine(@Payload() data: any) {
    try {
      const content: MessageUpdatedDto = data.content;

      //update the machine Model status
      const machineData = await this.machineModel.findOne({
        _id: content.machineId,
        deletedAt: null,
      });
      if (!machineData) {
        console.log('Invalid machine data.');
      }
      machineData.connectionStatus = content.status
        ? MAHCINE_CONNECTION_STATUS.ACTIVE
        : MAHCINE_CONNECTION_STATUS.INACTIVE;
      await machineData.save();
      console.log('Updated successfully.');
    } catch (error) {
      console.log(`Error processing machine data: ${error.message}`);
    }
  }
  @RabbitMQHandler('user.update.machine.status') // listern when machine is connect with serial number
  async handleUserAllStatusOfMachine(@Payload() data: any) {
    try {
      const content: MessageUpdatedDto = data.content;

      //update the machine Model status
      const machineData = await this.machineModel.findOne({
        _id: content.machineId,
        deletedAt: null,
      });
      if (!machineData) {
        console.log('Invalid machine data.');
      }
      machineData.connectionStatus = content.status
        ? MAHCINE_CONNECTION_STATUS.ACTIVE
        : MAHCINE_CONNECTION_STATUS.INACTIVE;
      await machineData.save();
      console.log('Updated successfully.');
    } catch (error) {
      console.log(`Error processing machine data: ${error.message}`);
    }
  }
}
