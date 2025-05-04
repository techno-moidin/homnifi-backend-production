import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TokenService } from './token.service';
import { Types } from 'mongoose';
import { TrxType } from '../global/enums/trx.type.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import ApiResponse from '../utils/api-response.util';
import { CreateSwapSettingDto } from './dto/create-swap-setting.dto';
import { PaginateDTO } from '../admin/global/dto/paginate.dto';

@Controller('tokens')
@UseGuards(JwtAuthGuard)
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  @Get('all')
  async findAll(@Query() paginateDTO: PaginateDTO) {
    const allTokens = await this.tokenService.findAllTokens2(paginateDTO);
    return new ApiResponse(allTokens, 'All tokens fetched successfully');
  }

  @Post('swap/settings')
  async createSwapSetting(@Body() createSwapSettingDto: CreateSwapSettingDto) {
    const data =
      await this.tokenService.createSwapSetting(createSwapSettingDto);
    return new ApiResponse(data, 'settings created successfully');
  }

  @Get('networks')
  async findAllNetworks() {
    const allNetworks = await this.tokenService.findAllNetworks();
    return new ApiResponse(allNetworks, 'All networks fetched successfully');
  }

  @Get('networks/supported-tokens/:id')
  async findSupportedNetworkByTokenId(@Param('id') token: Types.ObjectId) {
    const supportedNetworks =
      await this.tokenService.findSupportedNetworkByTokenId(token);
    return new ApiResponse(
      supportedNetworks,
      'Supported networks fetched successfully',
    );
  }

  @Get('get-pair-values')
  async getPairValues(@Query('symbol') symbol: string) {
    const allPairValues = await this.tokenService.getPairValues(symbol);
    return new ApiResponse(
      allPairValues,
      'All pair values fetched successfully',
    );
  }
}
