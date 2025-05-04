import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { CreateMachineTrackingDto } from './dto/create-machine-tracking.dto';
import { UpdateMachineTrackingDto } from './dto/update-machine-tracking.dto';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { CloudKMachine } from '../cloud-k/schemas/cloudk-machine.schema';
import mongoose, { ClientSession, Connection, Model } from 'mongoose';
import {
  MachineTrack,
  MAHCINE_TRACK_API_STATUS,
} from './schema/machine-tracking.schema';
import { User } from '../users/schemas/user.schema';
import { MachineTrackingWebhookDto } from '../webhook/dto/webhook-machine-tracking.dto';
import { WebhookMessages } from '../webhook/enums/webhook.enum';
import { CloudKProduct } from '../cloud-k/schemas/cloudk-products.schema';

@Injectable()
export class MachineTrackingService {
  constructor(
    @InjectModel(CloudKMachine.name)
    public machineModel: Model<CloudKMachine>,
    @InjectModel(MachineTrack.name)
    public machineTrackModel: Model<MachineTrack>,

    @InjectModel(CloudKProduct.name)
    public cloudKProductModel: Model<CloudKProduct>,
    @InjectModel(User.name)
    public userModel: Model<User>,
    @InjectConnection() private readonly connection: Connection,
  ) {}
  async updateMachineTracking(dto: MachineTrackingWebhookDto) {
    const session = await this.connection.startSession();
    await session.startTransaction();

    try {
      const [checkUserExists, cloudkProduct] = await Promise.all([
        this.userModel
          .findOne({
            blockchainId: dto.userBID,
            deletedAt: null,
          })
          .lean(),
        this.cloudKProductModel.findOne({
          externalProductId: dto.productId,
          deletedAt: null,
        }),
      ]);

      if (!checkUserExists) {
        throw new BadRequestException(WebhookMessages.BID + ' ' + dto.userBID);
      }

      if (!cloudkProduct) {
        throw new BadRequestException('Product Not found');
      }
      // check cloudk machines and get the machines based on user,orderId,product
      const cloudkMachines = await this.machineModel.find({
        user: checkUserExists._id,
        // orderId: dto.orderId,
        product: cloudkProduct._id,
        deletedAt: null,
      });

      if (!cloudkMachines || cloudkMachines.length === 0) {
        throw new HttpException('Machine Not found', 404);
      }

      let newTrack;

      if (cloudkMachines.length === 1) {
        // if cloudmachine is only one. then must update cloudmachine status and create new entry to machineTrackModel table
        // Check if the machine data contain the same serial number
        // if serial number not exist add the data other wise update the data
        //........add.......
        // check status is devlevered or pickeup
        // then throew error

        if (
          dto.shipmentStatus !== MAHCINE_TRACK_API_STATUS.CANCELLED &&
          (cloudkMachines[0].shipmentStatus ===
            MAHCINE_TRACK_API_STATUS.DELIVERED ||
            cloudkMachines[0].shipmentStatus ===
              MAHCINE_TRACK_API_STATUS.PICKED_UP)
        ) {
          throw new HttpException('This cloudMachine already delivered', 400);
        }
        if (cloudkMachines[0].orderId) {
          if (cloudkMachines[0].orderId !== dto.orderId) {
            throw new HttpException(
              'Order Id is doesn`t match with Cloudk machine',
              404,
            );
          }
        }

        if (
          cloudkMachines[0].shipmentItemIdentifier &&
          cloudkMachines[0].shipmentItemIdentifier !==
            dto.shipmentItemIdentifier
        ) {
          throw new HttpException(
            'Shipment Identifier is doesn`t match with Cloudk machine',
            400,
          );
        }
        newTrack = await this.createNewTracking(
          dto,
          cloudkMachines[0],
          session,
        );
      } else {
        // check any cloudk machine have the data with assigend serial number
        // if exist then update the data
        // else senarion is dowm
        const machineWIthSameSerialNumber = cloudkMachines.find(
          (m) =>
            m.shipmentItemIdentifier === dto.shipmentItemIdentifier &&
            m.shipmentStatus !== MAHCINE_TRACK_API_STATUS.DELIVERED &&
            m.shipmentStatus !== MAHCINE_TRACK_API_STATUS.PICKED_UP &&
            m.orderId === dto.orderId,
        );
        if (machineWIthSameSerialNumber) {
          //TODO: update machine and create new track
          newTrack = await this.createNewTracking(
            dto,
            machineWIthSameSerialNumber,
            session,
          );
        } else {
          const cloudMachinesWithOrderId = cloudkMachines.filter(
            (data) => data.orderId === dto.orderId,
          );
          if (cloudMachinesWithOrderId.length === 0) {
            new HttpException('There is no machines with this orderId !', 404);
          }
          // if have multiple cloud machines then filter cloud machines based it doesnt have serieal number and shipmentIdentifier then sort by collatoral count by descending order
          console.log({ cloudMachinesWithOrderId });

          const highColateralMachine = cloudMachinesWithOrderId
            .filter(
              (data) =>
                (data.assignedSerialNumber === null ||
                  !data.assignedSerialNumber) &&
                (data.shipmentItemIdentifier === null ||
                  !data.shipmentItemIdentifier),
            )
            .sort((a, b) => (b.collatoral ?? 0) - (a.collatoral ?? 0));

          if (highColateralMachine.length === 0) {
            throw new HttpException('Machine are Not found', 404);
          }

          newTrack = await this.createNewTracking(
            dto,
            highColateralMachine[0],
            session,
          );
        }
      }
      // console.log(newTrack);
      await session.commitTransaction();

      return newTrack;
    } catch (error) {
      await session.abortTransaction();
      if (error instanceof HttpException) throw error;
      throw new HttpException('Internal Server error : ', 500);
    } finally {
      session.endSession();
    }
  }

  async createNewTracking(
    dto: MachineTrackingWebhookDto,
    machine: CloudKMachine,
    session: ClientSession,
  ) {
    // check timestamp of new status and machine existing timestamp . it must be greater than existing timestamp
    if (
      dto.timestamp &&
      machine.trackingTimestamp &&
      new Date(dto.timestamp) <= new Date(machine.trackingTimestamp)
    ) {
      throw new BadRequestException(
        'TimeStamp must be greater than existing timestamp',
      );
    }

    const gracePeriod = 60;
    // update the Machine status
    let updatingData: any = {
      shipmentStatus: dto.shipmentStatus,
    };

    console.log({ machine });
    //set machine track data
    const machineTrackData = {
      assignedSerialNumber: dto.assignedSerialNumber,
      orderId: dto.orderId,
      user: machine.user,
      shipmentItemIdentifier: dto.shipmentItemIdentifier,
      shipmentStatus: dto.shipmentStatus,
      userBID: dto.userBID,
      productId: dto.productId,
      meta: {},
      cloudkMachine: machine._id,
      remark: dto.remark,
    };

    // if tracking id is mismatched with selected machine trackingId then throw error
    if (
      machine.trackingId &&
      machine.trackingId !== null &&
      dto.trackingId !== machine.trackingId
    ) {
      throw new HttpException(
        'Machine with this TrackingId are Not found',
        404,
      );
    }

    if (
      dto.shipmentStatus === MAHCINE_TRACK_API_STATUS.PICKED_UP ||
      dto.shipmentStatus === MAHCINE_TRACK_API_STATUS.DELIVERED
    ) {
      // if product is delivered update delivery date and grace period date in cloudkmachine table
      const today = new Date();

      updatingData['deliveryDate'] = new Date();
      const sixtyDaysFromNow = new Date(
        new Date(today.setDate(today.getDate() + gracePeriod)).setHours(
          0,
          0,
          0,
          0,
        ),
      );
      const tomorrow = new Date(
        new Date(new Date().setDate(new Date().getDate() + 1)).setHours(
          0,
          0,
          0,
          0,
        ),
      );
      updatingData['gracePeriodEndDate'] = sixtyDaysFromNow;
      updatingData['gracePeriodStartDate'] = tomorrow;
      machineTrackData['meta'] = {
        ...machineTrackData['meta'],
        gracePeriodInDays: gracePeriod,
      };
    }
    // adding the maching track data
    const newTrack = await new this.machineTrackModel(machineTrackData).save({
      session,
    });

    // if shipment status is inHouse then update cloudmachine with latest trackingId,assignedSerialNumber,shipmentIdentifier
    if (dto.shipmentStatus === MAHCINE_TRACK_API_STATUS.CANCELLED) {
      updatingData = {
        ...updatingData,
        shipmentItemIdentifier: dto.shipmentItemIdentifier,
        assignedSerialNumber: dto.assignedSerialNumber,
        latestTracking: newTrack._id,
        trackingId: null,
        trackingTimestamp: dto.timestamp,
      };
    } else {
      updatingData = {
        ...updatingData,
        shipmentItemIdentifier: dto.shipmentItemIdentifier,
        assignedSerialNumber: dto.assignedSerialNumber,
        latestTracking: newTrack._id,
        trackingId: dto.trackingId,
        trackingTimestamp: dto.timestamp,
      };
    }

    await machine.updateOne(updatingData, { session });

    return newTrack;
  }
}
