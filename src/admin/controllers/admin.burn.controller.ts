import { ACTION, PERMISSION_MODULE } from '@/src/enums/permission';
import { CreateBunDto } from '@/src/burn/dto/create-bun.dto';
import { BurnService } from '@/src/burn/burn.service';
import ApiResponse from '@/src/utils/api-response.util';
import { AppRequest } from '@/src/utils/app-request';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Permissions } from '../auth/decorators/permissions';
import { AdminGuard } from '../auth/guards/admin.guard';
import {
  UpdateBunStatusDto,
  UpdateBurnDto,
} from '@/src/burn/dto/update-bun-status';
import { UpdateBurnTokenDto } from '@/src/burn/dto/update-burn-tokens';
import { TelegramNotificationInterceptor } from '@/src/interceptor/telegram.notification';

@Controller('admin/burn')
@UseGuards(AdminGuard)
@UseInterceptors(TelegramNotificationInterceptor)
export class AdminBunController {
  constructor(private readonly BurnService: BurnService) {}

  @Post()
  @Permissions([{ action: [ACTION.WRITE], module: PERMISSION_MODULE.ADMIN }])
  async createBun(@Req() req: AppRequest, @Body() createBunDto: CreateBunDto) {
    const adminId = req.admin.id;
    const createdBun = await this.BurnService.createBurn(adminId, createBunDto);
    return new ApiResponse(createdBun, 'Burn Created Succesfully');
  }

  @Get()
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.ADMIN }])
  async getAllBuns() {
    const buns = await this.BurnService.getAllBurns();
    return new ApiResponse(buns, 'Burns retrieved successfully');
  }

  @Patch('update-status/:id')
  @Permissions([{ action: [ACTION.WRITE], module: PERMISSION_MODULE.ADMIN }])
  async updatePhaseStatus(
    @Param('id') phaseId: string,
    @Body() updatePhaseStatusDto: UpdateBunStatusDto,
  ) {
    const updatedPhase = await this.BurnService.updateBurnStatus(
      phaseId,
      updatePhaseStatusDto,
    );
    return new ApiResponse(updatedPhase, 'Burn status updated successfully');
  }

  @Patch('token-setting/:id')
  @Permissions([{ action: [ACTION.WRITE], module: PERMISSION_MODULE.ADMIN }])
  async updateBurnTokens(
    @Param('id') phaseId: string,
    @Body() updateBurnTokenDto: UpdateBurnTokenDto,
  ) {
    const updatedPhase = await this.BurnService.updateBurnTokenSettig(
      phaseId,
      updateBurnTokenDto,
    );
    return new ApiResponse(updatedPhase, 'Burn status updated successfully');
  }

  @Get('token-setting')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.ADMIN }])
  async getAllBunsTokenSetting() {
    const buns = await this.BurnService.getAllBurnsTokenSetting();
    return new ApiResponse(buns, 'Burns retrieved successfully');
  }

  @Put(':id')
  @Permissions([{ action: [ACTION.WRITE], module: PERMISSION_MODULE.ADMIN }])
  async updatePhaseData(
    @Param('id') phaseId: string,
    @Body() updatePhaseDto: UpdateBurnDto,
  ) {
    const updatedPhase = await this.BurnService.updatePhaseData(
      phaseId,
      updatePhaseDto,
    );
    return new ApiResponse(updatedPhase, 'Burn status updated successfully');
  }

  @Delete(':id')
  @Permissions([{ action: [ACTION.WRITE], module: PERMISSION_MODULE.ADMIN }])
  async deletePhaseData(@Param('id') phaseId: string) {
    const updatedPhase = await this.BurnService.deletePhaseData(phaseId);
    return new ApiResponse(updatedPhase, 'Deleted successfully.');
  }
}
