import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { NotificationModuleService } from './notification-module.service';
import { CreateNotificationDto } from './dto/create.notification.dto';
import ApiResponse from '../utils/api-response.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MarkNotificationReadDto } from './dto/mark.notification.read.dto';
import { PaginateNotificationsDTO } from './dto/paginate.notifications.dto';
import { NotificationTypeEnum } from './enums/notification-type.enum';
import { NotificationStatusEnum } from './enums/notification-status.enum';
import { NotificationEventEnum } from './enums/notification-event.enum';
import { NotificationCodeEnum } from './enums/notification-code.enum';
import { EmailService } from '../email/email.service';

@Controller('notification')
export class NotificationModuleController {
  constructor(
    private readonly notificationService: NotificationModuleService,
    private readonly emailService: EmailService,
  ) {}
  // @UseGuards(JwtAuthGuard)
  // @Post('read/:id')
  // async markAsRead(@Param('id') id: string): Promise<ApiResponse> {
  //   const notification = await this.notificationService.markAsRead(id);
  //   return new ApiResponse(
  //     notification,
  //     'Notification marked as read successfully',
  //   );
  // }

  @Post()
  async createNotification(
    @Body() createNotificationDTO: CreateNotificationDto,
  ) {
    ;
    // await this.notificationService.create(
    //   'Deposit request',
    //   'Your deposit request has created successfully',
    //   NotificationTypeEnum.SPCIFIC,
    //   NotificationStatusEnum.ACTIVE,
    //   NotificationEventEnum.DEPOSIT,
    //   NotificationCodeEnum.SUCCESS,
    //   [user._id],
    // );
    // this.emailService.deposit(
    //   'khalid.alsaleh.dev@gmail.com',
    //   ' fromToken.name',
    //   ' String(amount)',
    //   String(new Date()),
    //   " toWalletTransaction?.['_id']",
    //   ' user.email',
    // );
    // return this.notificationService.create(createNotificationDTO);
  }

  @Get('')
  @UseGuards(JwtAuthGuard)
  async getNotificationsForUser(
    @Req() req: any,
    @Query() paginateNotificationsDTO: PaginateNotificationsDTO,
  ) {
    return this.notificationService.getNotificationsWithReadStatus(
      req.user.userId,
    );
  }
  @Post('mark-read/')
  @UseGuards(JwtAuthGuard)
  async markAsRead(
    @Req() req: any,
    @Query() markNotificationReadDto: MarkNotificationReadDto,
  ) {
    return this.notificationService.markAsRead(
      markNotificationReadDto,
      req.user.userId,
    );
  }
  @Post('mark-all-read/')
  @UseGuards(JwtAuthGuard)
  async markAllAsRead(@Req() req: any) {
    return this.notificationService.markAllAsRead(req.user.userId);
  }
}
