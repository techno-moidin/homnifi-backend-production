import {
  Controller,
  Body,
  UseGuards,
  Post,
  HttpCode,
  Get,
  Query,
  Param,
} from '@nestjs/common';
import { WalletGatewayService } from './wallet-gateway.service';
import { WebhookGuard } from '../admin/auth/guards/webhook.guard';
import { Types } from 'mongoose';
import ApiResponse from '../utils/api-response.util';
import {
  FreezeWalletAmountDto,
  GetUserWalletDetailsDto,
  UnfreezeWalletAmountDto,
} from './dto/freeze-wallet-amount.dto';
import { UsersService } from '../users/users.service';
import { InjectModel } from '@nestjs/mongoose';
import { WalletService } from '../wallet/wallet.service';
import { TokenService } from '../token/token.service';

@Controller('webhooks/wallet-gateway')
@UseGuards(WebhookGuard('WS_HOMNIFI_SECRET_KEY'))
export class WalletGatewayController {
  constructor(
    private readonly walletGatewayService: WalletGatewayService,
    private readonly usersService: UsersService,
    private readonly walletService: WalletService,
    private readonly userService: UsersService,
    private readonly tokenService: TokenService,
  ) {}

  @Get('tokens')
  async findAll(@Query('platform') platform: string) {
    const allTokens = await this.tokenService.findAllHorysmallTokens(platform);
    return new ApiResponse(allTokens, 'All tokens fetched successfully');
  }

  @Get('user/wallets/:bid')
  async getUserExistWalletDetails(@Param('bid') bid: string) {
    const walletDetails =
      await this.walletGatewayService.getUserExistWalletDetails(bid);
    return new ApiResponse(
      walletDetails,
      'User wallet details with balances fetched successfully',
    );
  }

  @Post('user/wallets')
  async getUserWalletDetails(
    @Body() userWalletDetailsDto: GetUserWalletDetailsDto,
  ) {
    const walletDetails =
      await this.walletGatewayService.getUserWalletDetails(
        userWalletDetailsDto,
      );
    return new ApiResponse(
      walletDetails,
      'User wallet details with balances fetched successfully',
    );
  }

  @Post('freeze')
  async freeze(@Body() freezeWalletAmountDto: FreezeWalletAmountDto) {
    const freezeTransaction = await this.walletGatewayService.freeze(
      freezeWalletAmountDto,
    );
    return new ApiResponse(
      freezeTransaction,
      'Freeze request has been processed successfully.',
    );
  }

  @Post('unfreeze')
  async unfreeze(@Body() unfreezeWalletAmountDto: UnfreezeWalletAmountDto) {
    const unfreezeTransaction = await this.walletGatewayService.unfreeze(
      unfreezeWalletAmountDto,
    );
    return new ApiResponse(
      unfreezeTransaction,
      'Unfreeze request has been processed successfully.',
    );
  }

  @Post('withdraw')
  async withdraw(@Body() unfreezeWalletAmountDto: UnfreezeWalletAmountDto) {
    const withdraTransaction = await this.walletGatewayService.withdraw(
      unfreezeWalletAmountDto,
    );
    return new ApiResponse(
      withdraTransaction,
      'Withdraw request has been processed successfully.',
    );
  }
}
