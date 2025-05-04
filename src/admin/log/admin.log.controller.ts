import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { AdminLogService } from './admin.log.service';
import { PaginateDTO } from '../global/dto/paginate.dto';
import ApiResponse from '@/src/utils/api-response.util';
import { Permissions } from '../auth/decorators/permissions';
import { ACTION, PERMISSION_MODULE } from '@/src/enums/permission';

@Controller('admin/admin-log')
export class AdminLogController {
  constructor(private readonly adminLogService: AdminLogService) {}

  @Get('')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.ADMIN_LOG }])
  async getAdminLogs(@Req() req: any, @Query() paginateDTO: PaginateDTO) {
    const paginatedSuperNodeReward =
      await this.adminLogService.getAdminLogs(paginateDTO);
    return new ApiResponse(
      paginatedSuperNodeReward,
      'Paginated Logs fetched successfully',
    );
  }
}
