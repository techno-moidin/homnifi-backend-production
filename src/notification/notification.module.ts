import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationSchema } from './schemas/notification.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { Notification } from './schemas/notification.schema';
import { GatewayService } from '../gateway/gateway.service';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  exports: [NotificationService],
  providers: [NotificationService, GatewayService],
  controllers: [NotificationController],
})
export class NotificationModule {}
