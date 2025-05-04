import { Module } from '@nestjs/common';
import { AdminLogService } from './admin.log.service';
import { AdminLogController } from './admin.log.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminLog, AdminLogModel } from './schema/admin.log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AdminLog.name, schema: AdminLogModel }]),
  ],
  controllers: [AdminLogController],
  providers: [AdminLogService],
})
export class AdminLogModule {}
