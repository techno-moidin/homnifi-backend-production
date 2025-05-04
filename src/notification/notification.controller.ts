import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create.notification.dto';
import ApiResponse from '../utils/api-response.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { toObjectId } from '../utils/helpers';

@Controller('notification-module')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Req() req: any,
    @Body() createNotificationDto: CreateNotificationDto,
  ) {
    const userId = req.user.userId;
    const createdNotifications = await this.notificationService.create(
      createNotificationDto,
      toObjectId(userId),
    );
    return createdNotifications;
  }

  @UseGuards(JwtAuthGuard)
  @Get('')
  async findAll(
    @Req() req: any,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ): Promise<ApiResponse> {
    const userId = req.user.userId;
    const notifications = await this.notificationService.findAll(
      userId,
      limit || '10',
      page || '1',
    );
    return new ApiResponse(notifications);
  }

  @UseGuards(JwtAuthGuard)
  @Post('read/:id')
  async markAsRead(@Param('id') id: string): Promise<ApiResponse> {
    const notification = await this.notificationService.markAsRead(id);
    return new ApiResponse(
      notification,
      'Notification marked as read successfully',
    );
  }
  @UseGuards(JwtAuthGuard)
  @Post('all-read')
  async markAsAllRead(@Req() req: any): Promise<ApiResponse> {
    const userId = req?.user?.userId;
    await this.notificationService.markAsAllRead(userId);
    return new ApiResponse([], 'All notifications marked as read successfully');
  }
}
