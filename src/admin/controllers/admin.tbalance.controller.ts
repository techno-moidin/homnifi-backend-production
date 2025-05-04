import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PaginateDTO } from '../global/dto/paginate.dto';
import ApiResponse from '@/src/utils/api-response.util';
import { TBalanceService } from '@/src/t-balance/t-balance.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { Permissions } from '../auth/decorators/permissions';
import {
  AddTProductDto,
  UpdateTProductsDto,
} from '@/src/t-balance/dtos/tProducts.dto';
import { ACTION, PERMISSION_MODULE } from '@/src/enums/permission';
import { tBalanceReportLogPaginateDTO } from '@/src/t-balance/dtos/tbalancelog.dto';

@Controller('admin/t-balance')
@UseGuards(AdminGuard)
export class AdminTbalanceControllerController {
  constructor(private readonly tBalanceService: TBalanceService) {}

  @Get('products')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.T_BALANCE }])
  async findAllTProducts(@Query() paginateDTO: PaginateDTO) {
    const data = await this.tBalanceService.getAdminAllTProducts(paginateDTO);
    return new ApiResponse(data);
  }

  @Post('products')
  @Permissions([
    { action: [ACTION.WRITE], module: PERMISSION_MODULE.T_BALANCE },
  ])
  async createTProducts(@Body() addProduct: AddTProductDto) {
    const data = await this.tBalanceService.createTProduct(addProduct);
    return new ApiResponse(
      data,
      `T-balance product ${data.name} is created successfully.`,
    );
  }

  @Put('products/toggle/:id')
  @Permissions([
    { action: [ACTION.UPDATE], module: PERMISSION_MODULE.T_BALANCE },
  ])
  async updateTProductsToggle(@Param('id') productId: string) {
    const data = await this.tBalanceService.updateTProductsToggle(productId);
    const message = data.isVisible
      ? `T-balance product ${data.name} is enabled successfully.`
      : `T-balance product ${data.name} is disabled successfully.`;
    return new ApiResponse(data, message);
  }

  @Put('products/:id')
  @Permissions([
    { action: [ACTION.UPDATE], module: PERMISSION_MODULE.T_BALANCE },
  ])
  async updateTProducts(
    @Body() dto: UpdateTProductsDto,
    @Param('id') productId: string,
  ) {
    const data = await this.tBalanceService.updateTProduct(dto, productId);
    return new ApiResponse(
      data,
      `T-balance product ${data.name} is updated successfully.`,
    );
  }

  @Delete('products/:id')
  @Permissions([
    { action: [ACTION.DELETE], module: PERMISSION_MODULE.T_BALANCE },
  ])
  async deleteTProducts(@Param('id') productId: string) {
    const data = await this.tBalanceService.deleteTProduct(productId);
    return new ApiResponse(
      data,
      `T-balance product ${data.name} is deleted successfully`,
    );
  }

  @Get('process-history/list')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.T_BALANCE }])
  async getProcessHistory(@Query() paginateDTO: tBalanceReportLogPaginateDTO) {
    const data = await this.tBalanceService.getProcessHistory(paginateDTO);
    return new ApiResponse(data);
  }
}
