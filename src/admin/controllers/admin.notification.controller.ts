import {
  Body,
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import ApiResponse from '@/src/utils/api-response.util';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreateNotificationByBidDto } from '@/src/notification/dto/create.notification.by.bid.dto';
import { AdminService } from '../admin.service';
import { Permissions } from '../auth/decorators/permissions';
import { ACTION, PERMISSION_MODULE } from '@/src/enums/permission';
import { TelegramNotificationInterceptor } from '@/src/interceptor/telegram.notification';

@Controller('admin/notifications')
@UseGuards(AdminGuard)
@UseInterceptors(TelegramNotificationInterceptor)
export class AdminNotificationController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  @Permissions([{ action: [ACTION.WRITE], module: PERMISSION_MODULE.FAQ }])
  async newNotification(
    @Body() createNotificaitonDto: CreateNotificationByBidDto,
  ) {
    const createdNotification = await this.adminService.createNotification(
      createNotificaitonDto,
    );
    return new ApiResponse('Notification received successfully');
  }
}
