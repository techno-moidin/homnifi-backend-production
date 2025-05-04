import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { NotificationModule } from './schemas/notification-module.schema';
import mongoose, { Model } from 'mongoose';
import { NotificationUser } from './schemas/notification-user.schema';
import { NotificationHistory } from './schemas/notification-history.schema';
import { NotificationTypeEnum } from './enums/notification-type.enum';
import ApiResponse from '../utils/api-response.util';
import { MarkNotificationReadDto } from './dto/mark.notification.read.dto';
import { NotificationStatusEnum } from './enums/notification-status.enum';
import { NotificationEventEnum } from './enums/notification-event.enum';
import { NotificationCodeEnum } from './enums/notification-code.enum';

@Injectable()
export class NotificationModuleService {
  constructor(
    @InjectModel(NotificationModule.name)
    private notificationModel: Model<NotificationModule>,
    @InjectModel(NotificationUser.name)
    private notificationUserModel: Model<NotificationUser>,
    @InjectModel(NotificationHistory.name)
    private notificationHistoryModel: Model<NotificationHistory>,
  ) {}

  async create(
    title: string,
    description: string,
    type: NotificationTypeEnum,
    status: NotificationStatusEnum,
    event: NotificationEventEnum,
    code: NotificationCodeEnum,
    userIds?: any[],
  ) {
    const notification = await this.notificationModel.create({
      title,
      description,
      type,
      status,
      event,
      code,
    });
    if (type === NotificationTypeEnum.SPCIFIC) {
      if (userIds && userIds.length <= 0) {
        throw new Error('UserIds are required');
      }
      userIds.forEach(async (id) => {
        let notificationId = notification._id;
        let userId = id;
        if (!mongoose.Types.ObjectId.isValid(notification._id)) {
          notificationId = new mongoose.Types.ObjectId(notification._id);
        }
        if (!mongoose.Types.ObjectId.isValid(id)) {
          userId = new mongoose.Types.ObjectId(id);
        }
        await this.notificationUserModel.create({
          user: userId,
          notification: notificationId,
        });
      });
    }
  }

  async markAsRead(
    markNotificationReadDto: MarkNotificationReadDto,
    id: string,
  ) {
    const userId = new mongoose.Types.ObjectId(id);
    const notificationId = new mongoose.Types.ObjectId(
      markNotificationReadDto.id,
    );
    const notification = await this.notificationModel.findById(notificationId);
    if (!notification) {
      throw new Error('Notification not found');
    }
    const readNotification = await this.notificationHistoryModel.countDocuments(
      { notification: notificationId },
    );
    if (readNotification > 0) {
      throw new HttpException(
        'Notification already marked as read',
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.notificationHistoryModel.create({
      notification: notificationId,
      user: userId,
      readAt: new Date(),
    });

    return new ApiResponse({}, 'Notification marked as read');
  }

  async markAllAsRead(id: string) {
    const userId = new mongoose.Types.ObjectId(id);
    // Find all global notifications
    const globalNotifications = await this.notificationModel
      .find({ type: NotificationTypeEnum.GLOBAL })
      .exec();

    // Find all specific notifications for the user
    const userSpecificNotifications = await this.notificationUserModel
      .find({ user: userId })
      .exec();

    // Find all read notifications for the user
    const readNotifications = await this.notificationHistoryModel
      .find({ user: userId })
      .exec();
    const readNotificationIds = readNotifications.map((n) =>
      n.notification.toString(),
    );

    const allUnreadNotifications = [
      ...globalNotifications
        .filter(
          (notification) =>
            !readNotificationIds.includes(notification._id.toString()),
        )
        .map((notification) => ({
          user: userId,
          notification: notification._id,
          readAt: new Date(),
        })),
      ...userSpecificNotifications
        .filter(
          (userNotif) =>
            !readNotificationIds.includes(userNotif.notification.toString()),
        )
        .map((userNotif) => ({
          user: userId,
          notification: userNotif.notification,
          readAt: new Date(),
        })),
    ];

    // Insert all unread notifications into NotificationHistory
    await this.notificationHistoryModel.insertMany(allUnreadNotifications);

    return new ApiResponse({}, 'All notifications marked as read');
  }

  async getNotificationsForUser(id: string) {
    const userId = new mongoose.Types.ObjectId(id);
    const specificNotifications = await this.notificationUserModel
      .find({ user: userId, deletedAt: null })
      .populate('notification', {
        title: 1,
        description: 1,
        type: 1,
        status: 1,
        createdAt: 1,
      })
      .exec();
    const globalNotifications = await this.notificationModel
      .find({
        type: NotificationTypeEnum.GLOBAL,
        deletedAt: null,
        status: NotificationStatusEnum.ACTIVE,
      })
      .exec();
    const allNotifications = [...specificNotifications, ...globalNotifications];

    const readNotifications = await this.notificationHistoryModel
      .find({ user: userId })
      .exec();
    const readNotificationIds = readNotifications.map((n) =>
      n.notification.toString(),
    );

    const allNotificationsWithReadStatus = allNotifications.map(
      (notification) => ({
        ...notification.toObject(),
        isRead: readNotificationIds.includes(notification._id.toString()),
      }),
    );
    return new ApiResponse(
      allNotificationsWithReadStatus,
      'Notifications fetched successfully',
    );
  }

  async getNotificationsWithReadStatus(id: string) {
    const userId = new mongoose.Types.ObjectId(id);
    const notifications = await this.notificationModel
      .find()
      .sort({ createdAt: -1 })
      .exec();
    const readNotifications = await this.notificationHistoryModel
      .find({ user: userId })
      .exec();
    const readNotificationIds = readNotifications.map((n) =>
      n.notification.toString(),
    );

    const allNotifications = notifications.map((notification) => ({
      ...notification.toObject(),
      isRead: readNotificationIds.includes(notification._id.toString()),
    }));
    return new ApiResponse(
      allNotifications,
      'Notifications fetched successfully',
    );
  }
}
