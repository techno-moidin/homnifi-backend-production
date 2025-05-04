import { Module } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceController } from './maintenance.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { MainTenance, MainTenanceSchema } from './schema/maintenance.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MainTenance.name, schema: MainTenanceSchema },
    ]),
  ],
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
