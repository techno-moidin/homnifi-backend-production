import { CreateMaintenanceDto } from '@/src/maintenance/dto/create-maintenance.dto';
import { MaintenanceService } from '@/src/maintenance/maintenance.service';
import ApiResponse from '@/src/utils/api-response.util';
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Permissions } from '../auth/decorators/permissions';
import { ACTION, PERMISSION_MODULE } from '@/src/enums/permission';
import { PaginateDTO } from '../global/dto/paginate.dto';
import { AdminGuard } from '../auth/guards/admin.guard';
import { TelegramNotificationInterceptor } from '@/src/interceptor/telegram.notification';

@Controller('admin/maintenance')
@UseGuards(AdminGuard)
@UseInterceptors(TelegramNotificationInterceptor)
export class AdminMaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get()
  @Permissions([
    { action: [ACTION.READ], module: PERMISSION_MODULE.MAINTENANCE },
  ])
  async getMaintenance() {
    return new ApiResponse(await this.maintenanceService.getMaintenance());
  }
  @Get('all')
  @Permissions([
    { action: [ACTION.READ], module: PERMISSION_MODULE.MAINTENANCE },
  ])
  async getAllMaintenance(@Req() req: any, @Query() paginateDTO: PaginateDTO) {
    return new ApiResponse(
      await this.maintenanceService.getAllMaintenance(paginateDTO),
    );
  }
  @Post()
  @Permissions([
    { action: [ACTION.WRITE], module: PERMISSION_MODULE.MAINTENANCE },
  ])
  async create(@Body() createMaintenanceDto: CreateMaintenanceDto) {
    return new ApiResponse(
      await this.maintenanceService.createMaintenance(createMaintenanceDto),
    );
  }

  @Post('stop')
  @Permissions([
    { action: [ACTION.WRITE], module: PERMISSION_MODULE.MAINTENANCE },
  ])
  async stopMintenance(@Query('id') id: string) {
    return this.maintenanceService.stopMintenance(id);
  }
}
