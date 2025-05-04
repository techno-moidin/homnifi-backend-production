import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UnprocessableEntityException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ACTION, PERMISSION_MODULE, permissionList } from '../enums/permission';
import ApiResponse from '../utils/api-response.util';
import { AppRequest } from '../utils/app-request';
import { Permissions } from './auth/decorators/permissions';
import { CreateRoleDto } from './dto/create.role.dto';
import { AdminGuard } from './auth/guards/admin.guard';
import { PaginateDTO } from './global/dto/paginate.dto';
import { IsIdDTO } from './global/dto/id.dto';
import { UpdateRoleDto } from './dto/update.role.dto';
import { UpdateAdminDTO, UpdateAdminPasswordDTO } from './dto/update.admin.dto';
import { Types } from 'mongoose';
import { TFAGuard } from './auth/guards/TFA.guard';
import { TelegramNotificationInterceptor } from '../interceptor/telegram.notification';
import { AdminSignupDto } from './auth/dto/admin.auth.dto';

@UseGuards(AdminGuard)
@UseInterceptors(TelegramNotificationInterceptor)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Permissions([
    {
      module: PERMISSION_MODULE.ADMIN,
      action: [ACTION.ALL],
    },
    {
      module: PERMISSION_MODULE.SETTINGS,
      action: [ACTION.ALL],
    },
  ])
  @Get()
  async getAdmins(@Query() paginateDTO: PaginateDTO) {
    const list = await this.adminService.getAdmins(paginateDTO);
    return new ApiResponse(list);
  }

  @Get('permissions')
  async getPermissionList(@Req() req: AppRequest) {
    return new ApiResponse(permissionList);
  }

  @Permissions([
    {
      module: PERMISSION_MODULE.ADMIN,
      action: [ACTION.UPDATE],
    },
  ])
  @UseGuards(TFAGuard)
  @Put('admins/:id')
  async updateAdmin(
    @Param('id') id: string,
    @Body() updateAdminDTO: UpdateAdminDTO,
    @Req() req: AppRequest,
  ) {
    if (!req.admin.isSuperAdmin) {
      throw new UnprocessableEntityException(
        'You are not authorized to update any admin',
      );
    }
    const admin = await this.adminService.updateAdmin(id, updateAdminDTO, req);
    return new ApiResponse(admin, 'Admin updated successfully!');
  }

  @Permissions([
    {
      module: PERMISSION_MODULE.ADMIN,
      action: [ACTION.WRITE],
    },
  ])
  @Put('admins/:id/password')
  async updateAdminPassword(
    @Param('id') id: string,
    @Body() updateAdminDTO: UpdateAdminPasswordDTO,
  ) {
    const admin = await this.adminService.updateAdminPassword(
      id,
      updateAdminDTO,
    );
    return new ApiResponse(admin, 'Admin updated successfully!');
  }

  @Permissions([
    {
      module: PERMISSION_MODULE.ADMIN,
      action: [ACTION.DELETE],
    },
  ])
  @UseGuards(TFAGuard)
  @Delete('admins/:id')
  async deleteAdmin(@Param('id') id: string, @Req() req: AppRequest) {
    if (!req.admin.isSuperAdmin) {
      throw new UnprocessableEntityException(
        'You are not authorized to delete admin',
      );
    }
    const admin = await this.adminService.softDelete(id);
    return new ApiResponse(admin, 'Admin removed successfully!');
  }

  @Permissions([
    {
      module: PERMISSION_MODULE.ADMIN,
      action: [ACTION.UPDATE],
    },
  ])
  @Put('role')
  async updateRole(
    @Query() isIdDTO: IsIdDTO,
    @Body() updateRole: UpdateRoleDto,
  ) {
    const role = await this.adminService.updateRole(isIdDTO, updateRole);
    return new ApiResponse(role, 'Role updated successfully!');
  }

  @Permissions([
    {
      module: PERMISSION_MODULE.ADMIN,
      action: [ACTION.WRITE],
    },
  ])
  @Post('role')
  async createRole(@Body() createRoleDTO: CreateRoleDto) {
    const role = await this.adminService.createRole(createRoleDTO);
    return new ApiResponse(role, 'Role created successfully!');
  }

  @Get('role')
  async getRoles(@Query('query') query) {
    return this.adminService.getRoles(query);
  }

  @Get('admins/:id')
  async getAdminById(@Param('id') id: string, @Req() req: AppRequest) {
    const list = await this.adminService.getAdminById(id);
    return new ApiResponse(list);
  }

  @Get('online-users')
  async getNumberOfOnlineUsers() {
    const list = await this.adminService.getNumberOfOnlineUsers();
    return new ApiResponse(list);
  }

  @Get('databasedump')
  async getDatabaseDump(@Query() paginateDTO: PaginateDTO) {
    const list = await this.adminService.getAllDatabaseDumpLogs(paginateDTO);
    return new ApiResponse(list);
  }

  @Permissions([
    {
      module: PERMISSION_MODULE.ADMIN,
      action: [ACTION.WRITE],
    },
  ])
  @UseGuards(TFAGuard)
  @Post('subsuperadmin')
  async createSubSuperAdmin(
    @Body() createSubSuperAdminDto: AdminSignupDto,
    @Req() req: AppRequest,
  ) {
    if (!req.admin.isSuperAdmin) {
      throw new ForbiddenException(
        'Only SuperAdmin can create SubSuperAdmin accounts',
      );
    }
    const admin = await this.adminService.createSubSuperAdmin(
      createSubSuperAdminDto,
    );
    return new ApiResponse(admin, 'SubSuperAdmin created successfully!');
  }

  @Permissions([
    {
      module: PERMISSION_MODULE.ADMIN,
      action: [ACTION.UPDATE],
    },
  ])
  @UseGuards(TFAGuard)
  @Put('update-subsuperadmin/:id')
  async updateSubSuperAdminRole(
    @Param('id') id: string,
    @Query('role') roleId: string,
    @Req() req: AppRequest,
    @Body()
    payload: { firstName: string; lastName: string; isSubSuperAdmin: boolean },
  ) {
    if (!req.admin.isSuperAdmin) {
      throw new ForbiddenException(
        'Only SuperAdmin can update SubSuperAdmin roles',
      );
    }
    const admin = await this.adminService.updateAdminRole(id, roleId, payload);
    return new ApiResponse(admin, 'Sub super admin role updated successfully!');
  }

  @Permissions([
    {
      module: PERMISSION_MODULE.ADMIN,
      action: [ACTION.READ],
    },
  ])
  @Get('subsuperadmin-role')
  async getSubSuperAdminRole() {
    const role = await this.adminService.getSubSuperAdminRole();
    return new ApiResponse(role);
  }
}
