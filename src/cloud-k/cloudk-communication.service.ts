import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import mongoose, { Connection, Model, Types } from 'mongoose';
import { CloudKMachine } from './schemas/cloudk-machine.schema';

import {
  CloudKTransactions,
  CloudKTransactionTypes,
} from './schemas/cloudk-transactions.schema';

import { MachineConnectDto } from './dto/machine-connect.dto';
import { MachineSerialNumberDetails } from '../machine-tracking/schema/machine-serialNumber-details.schema';
import { MAHCINE_TRACK_API_STATUS } from '../machine-tracking/schema/machine-tracking.schema';
import { RABBITMQ_EXCHANGES } from '../utils/rabbitmq.constants';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';
import { catchError, firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { GET_PING_MACHINE_STATUS_ENDPOINT } from '../global/routes/external.app.routes';

@Injectable()
export class CloudKCommunicationService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(MachineSerialNumberDetails.name)
    private machineSerialNumberDetailsModel: Model<MachineSerialNumberDetails>,

    @InjectModel(CloudKMachine.name)
    private machineModel: Model<CloudKMachine>,

    private readonly rabbitMqProducerService: RabbitmqService,

    private httpService: HttpService,
    @InjectModel(CloudKTransactions.name)
    private cloudkTransactionModel: Model<CloudKTransactions>,
  ) {}

  async connectMachineWithSerialNumber(
    machineConnectData: MachineConnectDto,
    user: Types.ObjectId,
  ) {
    try {
      // find the machine details with machineId
      const machineData: any = await this.machineModel
        .findOne({
          _id: machineConnectData.machine,
          user,
          deletedAt: null,
        })
        .populate('user product');
      // Check the machine is exist or not
      if (!machineData) {
        throw new HttpException(`No machine with data found on homnifi.`, 400);
      }
      // check the machine already connected or not
      if (machineData.isMachineConnected) {
        throw new HttpException(
          `This machine is already connected with a serial number.`,
          400,
        );
      }
      // check the machine is deleverd or not
      if (
        machineData.assignedSerialNumber &&
        ![
          MAHCINE_TRACK_API_STATUS.DELIVERED,
          MAHCINE_TRACK_API_STATUS.PICKED_UP,
        ].includes(machineData.shipmentStatus)
      ) {
        throw new HttpException(
          `This machine is not deliverd to the user.`,
          400,
        );
      }

      if (
        machineData.assignedSerialNumber !== machineConnectData.serialNumber
      ) {
        throw new HttpException(`Serial number mismatched.`, 400);
      }
      // check the serial number is exist in machinedetail table
      const serialNumberData =
        await this.machineSerialNumberDetailsModel.findOne({
          sn: machineConnectData.serialNumber,
        });
      if (!serialNumberData) {
        throw new HttpException(`Serial number is not found.`, 400);
      }
      if (serialNumberData.linked) {
        throw new HttpException(`Serial number is already used.`, 400);
      }

      // update in the cloudk machine and update the machineserialNumberDetail table
      machineData.isMachineConnected = !machineData.isMachineConnected;
      machineData.serialNumberConnectedDate = new Date();
      serialNumberData.linked = !serialNumberData.linked;
      await Promise.all([machineData.save(), serialNumberData.save()]);

      // communicate with ping server
      const data = {
        userBid: machineData.user?.blockchainId,
        serialNumber: machineData.serialNumber,
        assignedSerialNumber: machineData.assignedSerialNumber,
        uniqueName: machineData.uniqueName,
        name: machineData.name,
        imageUrl: machineData.imageUrl,
        externalMachineId: machineData.externalMachineId,
        startDate: machineData.startDate,
        externalProductId: machineData.product.externalProductId,
        endDate: machineData.endDate,
        product: machineData.product._id,
        meta: {
          autoCompound: machineData.autoCompound,
          lockedPrice: machineData.lockedPrice,
          dlp: machineData.dlp,
          userId: machineData.user?._id,
          productId: machineData.product._id,
          homnifiMachineId: machineData._id,
        },
      };

      this.rabbitMqProducerService.publish(
        RABBITMQ_EXCHANGES.DATA_EXCHANGE,
        'user.update.machine.connect',
        data,
      );

      // add in cloudk transaction

      const cloudTransaction = new this.cloudkTransactionModel({
        user: machineData.user._id,
        type: CloudKTransactionTypes.MINTER_CONNECTED,
        machine: machineData._id,
        tokenAmount: 0,
        note: 'User connected the minter successfully',
        meta: {
          serialNumber: machineConnectData.serialNumber,
        },
      });

      await cloudTransaction.save();

      return {
        message: `Sucessfully machine is connect with serial number ${machineConnectData.serialNumber} `,
        machineDetails: machineData,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new Error(error);
    }
  }

  async getActiveStatus(machineActiveStatusDto, user) {
    try {
      // find the machine
      const { machine, fromDate, toDate } = machineActiveStatusDto;
      const machineData: any = await this.machineModel
        .findOne({
          _id: new Types.ObjectId(machine),
          user,
          deletedAt: null,
        })
        .populate('user product');

      // Check the machine is exist or not
      if (!machineData) {
        throw new HttpException(`No machine with data found on homnifi.`, 400);
      }

      if (!machineData.isMachineConnected) {
        return {
          serialNumberConnectedDate: machineData.serialNumberConnectedDate,
          gracePeriodEndDate: machineData.gracePeriodEndDate,
          gracePeriodStartDate: machineData.gracePeriodStartDate,
          isMachineConnected: machineData.isMachineConnected,
          activeStatusData: [],
        };
      }

      // Convert input dates to Date objects (if they exist)
      let startDate = fromDate
        ? new Date(fromDate.trim().replace(' ', 'T').replace(' 00:00', 'Z'))
        : null;
      let endDate = toDate
        ? new Date(toDate.trim().replace(' ', 'T').replace(' 00:00', 'Z'))
        : null;

      // Ensure serialNumberConnectedDate is a Date object
      const serialConnectedDate = new Date(
        machineData.serialNumberConnectedDate,
      );
      const currentDate = new Date(); // Current system date

      // Validate and adjust date range
      if (startDate && endDate) {
        if (startDate < serialConnectedDate) {
          startDate = serialConnectedDate;
        }
        if (endDate > currentDate) {
          endDate = currentDate;
        }
      } else {
        startDate = serialConnectedDate;
        endDate = currentDate;
      }

      // call rabitMq for get the data from the ping server
      const payload = {
        userBid: machineData?.user?.blockchainId as any,
        serialNumber: machineData.serialNumber?.toString() ?? '',
        assignedSerialNumber:
          machineData.assignedSerialNumber?.toString() ?? '',
        startDate: startDate,
        endDate: endDate,
      };
      const config = new ConfigService();

      const PING_SERVER_BASE_URL = config.get<string>('PING_SERVER_BASE_URL');
      const url = `${PING_SERVER_BASE_URL}${GET_PING_MACHINE_STATUS_ENDPOINT}`;
      const key = config.get<string>('PING_SERVER_WEBHOOK_KEY');
      const response = await firstValueFrom(
        this.httpService
          .post(url, payload, {
            headers: {
              'x-api-key': key,
            },
          })
          .pipe(
            catchError((error) => {
              // console.log({ error });
              throw new HttpException(
                error.response.data,
                error.response?.status,
              );
            }),
          ),
      );
      return {
        serialNumberConnectedDate: machineData.serialNumberConnectedDate,
        gracePeriodEndDate: machineData.gracePeriodEndDate,
        gracePeriodStartDate: machineData.gracePeriodStartDate,
        isMachineConnected: machineData.isMachineConnected,
        activeStatusData: response.data?.data ?? [],
      };
    } catch (error) {
      throw new HttpException(
        error.message ?? error,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
