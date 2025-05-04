import { Module } from '@nestjs/common';
import { NotificationModuleService } from './notification-module.service';
import { NotificationModuleController } from './notification-module.controller';
import { NotificationModule } from '../notification/notification.module';
import {
  NotificationUser,
  NotificationUserSchema,
} from './schemas/notification-user.schema';
import {
  NotificationHistory,
  NotificationHistorySchema,
} from './schemas/notification-history.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationModuleSchema } from './schemas/notification-module.schema';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NotificationModule.name, schema: NotificationModuleSchema },
      { name: NotificationUser.name, schema: NotificationUserSchema },
      { name: NotificationHistory.name, schema: NotificationHistorySchema },
    ]),
    EmailModule,
  ],
  providers: [NotificationModuleService],
  controllers: [NotificationModuleController],
  exports: [NotificationModuleService],
})
export class NotificationModuleModule {}
