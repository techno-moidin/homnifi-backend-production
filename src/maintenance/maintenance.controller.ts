import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import ApiResponse from '../utils/api-response.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IMPERSONATE } from '../utils/constants';

@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get()
  async getMaintenance(@Req() req: any) {
    if (req?.user?.mode === IMPERSONATE) {
      return new ApiResponse(null);
    }

    return new ApiResponse(await this.maintenanceService.getMaintenance());
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async getMaintenance3() {
    return new ApiResponse(await this.maintenanceService.getMaintenance());
  }
}
