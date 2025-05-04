import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TBalanceService } from './t-balance.service';
import ApiResponse from '../utils/api-response.util';
import { AppRequest } from '../utils/app-request';
import {
  AddTProductDto,
  PurchaseTProductDto,
  PurchaseTProductUpdateDto,
} from './dtos/tProducts.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Types } from 'mongoose';
import { PaginateDTO } from '../admin/global/dto/paginate.dto';
import {
  tBalanceLogPaginateDTO,
  tBalanceReportLogPaginateDTO,
} from './dtos/tbalancelog.dto';

@Controller('t-balance')
@UseGuards(JwtAuthGuard)
export class TBalanceController {
  constructor(private readonly tBalanceService: TBalanceService) {}
  // Get all products
  @Get('products')
  async findAllTProducts(@Query() paginateDTO: PaginateDTO) {
    const data = await this.tBalanceService.getAllTProducts(paginateDTO);
    return new ApiResponse(data);
  }

  // @Post('products')
  // async AllTProducts(@Body() addProduct: AddTProductDto) {
  //   const data = await this.tBalanceService.createTProduct(addProduct);
  //   return new ApiResponse(data);
  // }

  //Purchase product
  @Post('purchase')
  async purchaseTbalanceProduct(
    @Req() req: AppRequest,
    @Body() purchaseTProductDto: PurchaseTProductDto,
  ) {
    const user = new Types.ObjectId(req.user.userId);
    // const user = new Types.ObjectId('66c5d5b8814a911986f5a499');

    const data = await this.tBalanceService.purchaseTbalanceProduct(
      user,
      purchaseTProductDto,
    );
    return new ApiResponse(data);
  }
  @Get('purchase/history')
  async purchaseTbalanceProductHistory(
    @Req() req: AppRequest,
    @Query() paginateDTO: PaginateDTO,
  ) {
    const user = new Types.ObjectId(req.user.userId);
    // const user = new Types.ObjectId('66c5d5b8814a911986f5a499');

    const data = await this.tBalanceService.purchaseTbalanceProductHistory(
      user,
      paginateDTO,
    );
    return new ApiResponse(data);
  }
  @Put('purchase/:id')
  async purchaseTbalanceProductUpdate(
    @Req() req: AppRequest,
    @Param('id') productId: string,
    @Body() purchaseTProductDto: PurchaseTProductUpdateDto,
  ) {
    const user = new Types.ObjectId(req.user.userId);
    // const user = new Types.ObjectId('66c5d5b8814a911986f5a499');

    const data = await this.tBalanceService.purchaseTbalanceProductUpdate(
      user,
      new Types.ObjectId(productId),
      purchaseTProductDto,
    );
    return new ApiResponse(data);
  }

  @Get('test')
  async purchaseTbalanceProductTest(
    @Req() req: AppRequest,
    @Query() paginateDTO: PaginateDTO,
  ) {
    const data = await this.tBalanceService.processTbalance();
    return new ApiResponse({ message: 'generated' });
  }
  @Get('generate-swap-report')
  async generateSwapReport(@Req() req: AppRequest) {
    return await Promise.all([
      this.tBalanceService.swapTBalanceReport(),
      this.tBalanceService.processTbalance(),
    ]);
  }

  @Get('balance')
  async twalletBalance(@Req() req: AppRequest) {
    const user = new Types.ObjectId(req.user.userId);
    // const user = new Types.ObjectId('66c5d5b8814a911986f5a499');

    const data = await this.tBalanceService.twalletBalance(user);
    return new ApiResponse(data);
  }

  @Get('wallet/list')
  async twalletSwapSettingList(@Req() req: AppRequest) {
    const user = new Types.ObjectId(req.user.userId);
    // const user = new Types.ObjectId('66c5d5b8814a911986f5a499');

    const data = await this.tBalanceService.twalletSwapSettingList(user);
    return new ApiResponse(data);
  }

  @Get('process-history/list')
  async processHistoryList(
    @Req() req: AppRequest,
    @Query() paginateDTO: tBalanceReportLogPaginateDTO,
  ) {
    const data = await this.tBalanceService.getProcessHistory(paginateDTO);
    return new ApiResponse(data);
  }

  @Get('swapped/total')
  async twalletSwappedTotal(@Req() req: AppRequest) {
    const user = new Types.ObjectId(req.user.userId);
    // const user = new Types.ObjectId('66c5d5b8814a911986f5a499');

    const data = await this.tBalanceService.twalletSwappedTotal(user);
    return new ApiResponse(data);
  }
}
