import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BurnService } from './burn.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import ApiResponse from '../utils/api-response.util';
import { Types } from 'mongoose';

@UseGuards(JwtAuthGuard)
@Controller('burn')
export class BurnController {
  constructor(private readonly burnService: BurnService) {}

  @Get()
  async getActiveBurn(@Req() req: any) {
    const result = await this.burnService.fetchActiveBurn();
    return new ApiResponse(result);
  }

  @Get('calculation')
  async getActiveBurnCalculation(
    @Req() req: any,
    @Query('amount') amount: string,
    @Query('machine') machine: string,
    @Query('price') price: string,
    @Query('HundredPercentClicked') HundredPercentClicked: boolean,
  ) {
    // if (parseInt(amount, 10) <= 0) {
    //   throw new BadRequestException('Amount must be greater than zero');
    // }
    const result = await this.burnService.getActiveBurnCalculation(
      parseFloat(amount),
      new Types.ObjectId(machine),

      new Types.ObjectId(req.user.userId),
      price,
      HundredPercentClicked,
    );
    return new ApiResponse(result);
  }

  @Get('limit')
  async getBurnTokenLimit(
    @Req() req: any,
    @Query('machine') machine: string,
    @Query('price') price: string,
  ) {
    const result = await this.burnService.getBurnTokenLimit(
      new Types.ObjectId(machine),
      new Types.ObjectId(req.user.userId),
      price,
    );
    return new ApiResponse(result);
  }

  @Post('join')
  async joinActiveBurn(@Req() req: any) {
    const result = await this.burnService.joinActiveBurn(
      new Types.ObjectId(req.user.userId),
    );
    return new ApiResponse(result, 'User joined campaign successfully');
  }

  @Post('token')
  async burnTokenUsdkPromoToSmLYK(@Req() req: any) {
    const result = await this.burnService.burnUsdkTosmLYK(
      new Types.ObjectId(req.user.userId),
    );
    return new ApiResponse(result);
  }

  @Get('user/status')
  async userStatusForActiveBurn(@Req() req: any) {
    const result = await this.burnService.userStatusForActiveBurn(
      new Types.ObjectId(req.user.userId),
    );

    return new ApiResponse(result);
  }
}
