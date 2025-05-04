import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';
import { CreateNotificationDto } from './dto/create.notification.dto';
import { Notification } from './schemas/notification.schema';
import { aggregatePaginate } from '../utils/pagination.service';
import { GatewayService } from '../gateway/gateway.service';
import { SOCKET_EVENT_NAMES } from '../gateway/Constants/socket.event.messages';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,
    private gatewayService: GatewayService,
    @InjectModel(User.name)
    private userModel: Model<User>,
  ) {}

  async create(
    createNotificationDto: CreateNotificationDto,
    userId?: Types.ObjectId,
  ): Promise<Notification[]> {
    if (
      !userId &&
      !createNotificationDto.userIds &&
      createNotificationDto.userIds.length === 0
    ) {
      throw new NotFoundException('User ID or User IDs are required');
    }
    if (userId) {
      const createdNotification = await this.notificationModel.create({
        user: userId,
        ...createNotificationDto,
      });

      const user = await this.userModel.findById(userId);

      this.gatewayService.emitSocketEventNotification({
        message: createNotificationDto.message,
        eventName: user.blockchainId,
        data: {
          eventAction: SOCKET_EVENT_NAMES.NEW_NOTIFICATION,
          title: createNotificationDto.title,
          message: createNotificationDto.message,
          type: createNotificationDto.type,
        },
      });

      return [createdNotification];
    } else {
      const { userIds, ...notificationData } = createNotificationDto;

      const notifications = userIds.map((userId) => {
        const userObjectId = new Types.ObjectId(userId);
        return {
          ...notificationData,
          user: userObjectId,
        };
      });

      for (const userId of userIds) {
        const user = await this.userModel.findById(userId);
        this.gatewayService.emitSocketEventNotification({
          message: createNotificationDto.message,
          eventName: user.blockchainId,
          data: {
            eventAction: SOCKET_EVENT_NAMES.NEW_NOTIFICATION,
            title: createNotificationDto.title,
            message: createNotificationDto.message,
            type: createNotificationDto.type,
          },
        });
      }

      const createdNotifications =
        await this.notificationModel.insertMany(notifications);
      return createdNotifications;
    }
  }

  async findAll(userId: string, limit: string, page: string) {
    const pipeline = [
      {
        $match: { user: new Types.ObjectId(userId) },
      },
      {
        $sort: { createdAt: -1 },
      },
    ];

    const data = await aggregatePaginate(
      this.notificationModel,
      pipeline,
      Number(page),
      Number(limit),
    );

    return data;
  }

  async markAsRead(id: string): Promise<any> {
    const notificationId = new mongoose.Types.ObjectId(id);
    const notification = await this.notificationModel
      .findByIdAndUpdate(notificationId, { read: true }, { new: true })
      .exec();
    if (!notification) {
      throw new NotFoundException(`Notification with ID "${id}" not found`);
    }
    return notification;
  }
  async markAsAllRead(id: string): Promise<any> {
    const userId = new mongoose.Types.ObjectId(id);
    const notification = await this.notificationModel
      .updateMany(
        { user: new Types.ObjectId(userId) },
        { read: true },
        { new: true },
      )
      .exec();
    if (!notification) {
      throw new NotFoundException(`Notification with ID "${id}" not found`);
    }
    return notification;
  }

  async delete(id: string): Promise<void> {
    const result = await this.notificationModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Notification with ID "${id}" not found`);
    }
  }
}
