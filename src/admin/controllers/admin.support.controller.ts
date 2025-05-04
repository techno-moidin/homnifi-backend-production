import { SupportService } from '@/src/support/support.service';
import { CreateSupportDto } from '@/src/support/dto/create-support.dto';
import { UpdateSupportDto } from '@/src/support/dto/update-support.dto';
import { AdminGuard } from '../auth/guards/admin.guard';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import ApiResponse from '@/src/utils/api-response.util';
import { Permissions } from '../auth/decorators/permissions';
import { ACTION, PERMISSION_MODULE } from '@/src/enums/permission';
import { TelegramNotificationInterceptor } from '@/src/interceptor/telegram.notification';

@Controller('admin/support')
@UseGuards(AdminGuard)
@UseInterceptors(TelegramNotificationInterceptor)
export class AdminSupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post()
  @Permissions([{ action: [ACTION.WRITE], module: PERMISSION_MODULE.SUPPORT }])
  async create(@Body() createSupportDto: CreateSupportDto) {
    const createdSupport = await this.supportService.create(createSupportDto);
    return new ApiResponse(createdSupport, 'New support created successfully');
  }

  @Get()
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.SUPPORT }])
  async findAll() {
    const supports = await this.supportService.findAll();
    return new ApiResponse(supports, 'Supports retrieved successfully');
  }

  @Get(':id')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.SUPPORT }])
  async findOne(@Param('id') id: string) {
    const support = await this.supportService.findOne(id);
    return new ApiResponse(support, 'Support retrieved successfully');
  }

  @Put(':id')
  @Permissions([{ action: [ACTION.UPDATE], module: PERMISSION_MODULE.SUPPORT }])
  async update(
    @Param('id') id: string,
    @Body() updateSupportDto: UpdateSupportDto,
  ) {
    const updatedSupport = await this.supportService.update(
      id,
      updateSupportDto,
    );
    return new ApiResponse(updatedSupport, 'Support updated successfully');
  }

  @Put(':id/toggle-status')
  @Permissions([{ action: [ACTION.UPDATE], module: PERMISSION_MODULE.SUPPORT }])
  async toggleStatus(@Param('id') id: string) {
    const toggledSupport = await this.supportService.toggleStatus(id);
    return new ApiResponse(
      toggledSupport,
      'Support status toggled successfully',
    );
  }
}
