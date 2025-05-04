import { TrustpilotWebhookModel } from './schemas/trustpilotModel.schema';
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { WebhookDto } from './dto/webhook.dto';
import ApiResponse from '../utils/api-response.util';
import { WebhookGuard } from '../admin/auth/guards/webhook.guard';
import {
  WebhookDataStatus,
  WebhookMessages,
  WebhookType,
} from './enums/webhook.enum';
import { WalletService } from '../wallet/wallet.service';
import { WebhookDepositDto } from './dto/webhook-deposit.dto';
import { WebhookUpdateUserDto } from '@/src/webhook/dto/webhook-update-user.dto';
import { UsersService } from '@/src/users/users.service';
import { UpdateUserDto } from '@/src/users/dto/update-user.dto';
import { CloudKWalletBalanceDto } from './dto/cloudk-webhook.dto';
import { CloudKWalletTransactionDto } from './dto/cloudk-wallet-transaction.dto';
import { WithdrawSettingsDTO } from '@/src/admin/global/dto/paginate.dto';
import { TokenService } from '@/src/token/token.service';
import { UpdateUserEmailDto } from '@/src/webhook/dto/update-user-email.dto';
import { TrustpilotNewReviewDto } from './dto/trsutpilot-new-review.dto';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { lastValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import { HttpService } from '@nestjs/axios';
import { Response } from 'express';
import { CheckMembershipDto } from './dto/check-membership.dto';
import { MachineTrackingService } from '../machine-tracking/machine-tracking.service';
import { MachineTrackingWebhookDto } from './dto/webhook-machine-tracking.dto';
import { DeliveryFeeWebhookDto } from './dto/webhook.delivery-fee.dto';

@Controller('webhooks')
export class WebhookController {
  constructor(
    private readonly webhookService: WebhookService,
    private readonly walletService: WalletService,
    private readonly tokenService: TokenService,
    private readonly usersService: UsersService,
    private readonly httpService: HttpService,
    private readonly machineTrackingService: MachineTrackingService,

    @InjectModel(TrustpilotWebhookModel.name)
    private readonly trustpilotWebhookModel: Model<TrustpilotWebhookModel>,
  ) {}
  @UseGuards(WebhookGuard('WS_HOMNIFI_SECRET_KEY'))
  // @Post('deposit')
  // async handleWebhook(@Body() webhookDto: WebhookDto) {
  //   const platform = webhookDto.platform;
  //   let webhookRequestId: any;
  //   const newTrack = await this.webhookService.createWebhook({
  //     payload: webhookDto,
  //     platform,
  //   });
  //   try {
  //     if (newTrack._id) {
  //       webhookRequestId = newTrack._id;
  //       const isDataValidated =
  //         await this.webhookService.checkWebhookValidation(
  //           webhookDto,
  //           platform,
  //           webhookRequestId,
  //         );

  //       if (isDataValidated) {
  //         const { status } = await this.walletService.webhookDeposit(
  //           webhookDto,
  //           platform,
  //           webhookRequestId,
  //         );
  //         if (!status) {
  //           await this.webhookService.createWebhook({
  //             payload: webhookDto,
  //             type: WebhookType.AMOUNT,
  //             message: WebhookMessages.AMOUNT,
  //             status: WebhookDataStatus.FAILED,
  //             platform,
  //             webhookRequestId,
  //           });
  //           throw new BadRequestException(WebhookMessages.AMOUNT);
  //         }

  //         const orderProcesData = await this.webhookService.createWebhook({
  //           payload: webhookDto,
  //           platform,
  //           status: WebhookDataStatus.SUCCESS,
  //           type: WebhookType.COMPLETED,
  //           message: WebhookMessages.COMPLETED,
  //           webhookRequestId,
  //         });
  //         if (orderProcesData._id) {
  //           const webhookResponseData = {
  //             requestId: orderProcesData._id,
  //           };
  //           return new ApiResponse(
  //             webhookResponseData,
  //             `Deposit success! Your account is credited with ${webhookDto.amount} ${webhookDto.token}.`,
  //           );
  //         } else {
  //           await this.webhookService.createWebhook({
  //             payload: webhookDto,
  //             type: WebhookType.UNEXPECTED,
  //             message: WebhookMessages.UNEXPECTED,
  //             status: WebhookDataStatus.FAILED,
  //             platform,
  //             webhookRequestId,
  //           });
  //         }
  //       }
  //     }
  //   } catch (error) {
  //     if (error instanceof BadRequestException) {
  //       throw error;
  //     }
  //     await this.webhookService.createWebhook({
  //       payload: webhookDto,
  //       type: WebhookType.UNEXPECTED,
  //       message: error.message || WebhookMessages.UNEXPECTED,
  //       status: WebhookDataStatus.FAILED,
  //       platform: platform,
  //       webhookRequestId,
  //     });
  //     throw new InternalServerErrorException('Failed to process webhook', {
  //       cause: error,
  //       description: error.message || 'An unexpected error occurred',
  //     });
  //   }
  // }
  @UseGuards(WebhookGuard('WS_HOMNIFI_SECRET_KEY'))
  @Post('deposit/v2')
  // async handleDepositWebhook(@Body() webhookDto: WebhookDepositDto) {
  //
  //   throw new BadRequestException('Bad Request');
  // }
  async handleDepositWebhook(@Body() webhookDto: WebhookDepositDto) {
    const platform = webhookDto.platform;
    let webhookRequestId: any;
    const newTrack = await this.webhookService.createWebhook({
      payload: webhookDto,
      platform,
    });
    if (!newTrack._id) {
      throw new HttpException('Failed to create webhook', 400);
    }
    try {
      webhookRequestId = newTrack._id;
      //Check the webhook Data is valid or not
      const { validateStatus, isPlatform } =
        await this.webhookService.checkDepositWebhookValidation(
          webhookDto,
          platform,
          webhookRequestId,
        );

      //Function for deposit
      const { status } = await this.walletService.webhookTokenDeposit(
        webhookDto,
        isPlatform,
        webhookRequestId,
      );

      if (!status) {
        await this.webhookService.createWebhook({
          payload: webhookDto,
          type: WebhookType.AMOUNT,
          message: WebhookMessages.AMOUNT,
          status: WebhookDataStatus.FAILED,
          platform,
          webhookRequestId,
        });
        throw new BadRequestException(WebhookMessages.AMOUNT);
      }

      const orderProcesData = await this.webhookService.createWebhook({
        payload: webhookDto,
        platform,
        status: WebhookDataStatus.SUCCESS,
        type: WebhookType.COMPLETED,
        message: WebhookMessages.COMPLETED,
        webhookRequestId,
      });

      if (!orderProcesData._id) {
        await this.webhookService.createWebhook({
          payload: webhookDto,
          type: WebhookType.UNEXPECTED,
          message: WebhookMessages.UNEXPECTED,
          status: WebhookDataStatus.FAILED,
          platform,
          webhookRequestId,
        });
      }
      const webhookResponseData = {
        requestId: orderProcesData._id,
      };
      return new ApiResponse(
        webhookResponseData,
        `Deposit success! Your account is credited with ${webhookDto.amount} ${webhookDto.token}.`,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      await this.webhookService.createWebhook({
        payload: webhookDto,
        type: WebhookType.UNEXPECTED,
        message: error.message || WebhookMessages.UNEXPECTED,
        status: WebhookDataStatus.FAILED,
        platform,
        webhookRequestId,
      });
      throw new InternalServerErrorException('Failed to process webhook', {
        cause: error,
        description: error.message || 'An unexpected error occurred',
      });
    }
  }

  @UseGuards(WebhookGuard('WS_HOMNIFI_SECRET_KEY'))
  @Patch('users')
  async updateUserWebhook(
    @Body() webhookUpdateUserDto: WebhookUpdateUserDto,
  ): Promise<ApiResponse> {
    const update = Object.assign({}, webhookUpdateUserDto);
    delete update.bid;
    const updatedUser = await this.usersService
      .updateUserByBid(webhookUpdateUserDto.bid, update as UpdateUserDto)
      .catch((error) => {
        this.webhookService
          .createWebhook({
            payload: webhookUpdateUserDto,
            type: WebhookType.UNEXPECTED,
            message: error.message || WebhookMessages.UNEXPECTED,
            status: WebhookDataStatus.FAILED,
            platform: 'homnifi',
          })
          .catch((e) => console.error(e));
        throw new HttpException(`Failed to update user data`, 500);
      });
    if (!updatedUser) throw new HttpException(`User not found`, 400);
    this.webhookService
      .createWebhook({
        payload: webhookUpdateUserDto,
        type: WebhookType.USER_DATA_UPDATE,
        status: WebhookDataStatus.SUCCESS,
        message: WebhookMessages.COMPLETED,
        platform: 'homnifi',
      })
      .catch((e) => console.error(e));
    return new ApiResponse(update, `User updated successfully`);
  }

  @UseGuards(WebhookGuard('HOMNIFI_CLOUDK_SECRET_KEY'))
  @Post('wallet/balance')
  async getWalletBalance(@Body() walletDto: CloudKWalletBalanceDto) {
    try {
      const balance =
        await this.walletService.getWalletBalanceForCloudKWebhook(walletDto);
      return new ApiResponse(balance, 'Wallet Balance');
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(WebhookGuard('HOMNIFI_CLOUDK_SECRET_KEY'))
  @Post('wallet/cloudk/transaction')
  async createCloudKWalletTransaction(
    @Body() walletTransactionDto: CloudKWalletTransactionDto,
  ) {
    try {
      const balance =
        await this.walletService.createCloudKWalletTransaction(
          walletTransactionDto,
        );
      return new ApiResponse(balance, 'Transaction Successful');
    } catch (error) {
      throw error;
    }
  }

  @Get('deposit/setting')
  @UseGuards(WebhookGuard('WS_HOMNIFI_SECRET_KEY'))
  async getDepositSetting(@Query() paginateDto: WithdrawSettingsDTO) {
    const data = await this.tokenService.getDepositSettings(paginateDto);
    return new ApiResponse(data, 'success');
  }

  @UseGuards(WebhookGuard('WS_HOMNIFI_SECRET_KEY'))
  @Post('user/change/email')
  async updateUserEmail(@Body() emailUserDto: UpdateUserEmailDto) {
    const data = await this.usersService.updateUserByBid(emailUserDto.bid, {
      email: emailUserDto.email,
    });
    if (!data) throw new NotFoundException('User not found.');
    return new ApiResponse(data, 'success');
  }

  @Get('trustpilot/review/redirected')
  async handleTrustpilotRedirectedWebhook(
    @Query('userBID') userBID: string,
    @Query('redirectUrl') redirectUrl: string,
    @Res() res: Response,
  ) {
    await this.usersService.updateUserReviewByBid(userBID);
    return res.redirect(redirectUrl);
  }

  @Post('trustpilot/review/new')
  async handleTrustpilotWebhook(@Body() payload: any, @Res() res: Response) {
    console.log(
      'Received Trustpilot Webhook:',
      JSON.stringify(payload, null, 2),
    );
    try {
      if (payload?.events) {
        payload.events.forEach(async (event) => {
          console.log('Event Name:', event.eventName);
          console.log('Review Title:', event.eventData?.title);
          console.log('Review Text:', event.eventData?.text);
          console.log('Stars:', event.eventData?.stars);
          console.log('refrenceId:', event.eventData?.referenceId);
          await this.usersService.updateUserReviewByBid(
            event.eventData?.referenceId,
          );
        });
      }
      return res.redirect(process.env.FRONTEND_URL);
    } catch (error) {
      console.error('handle TrustpilotWebhook  Error :', error);
      await this.trustpilotWebhookModel.create({
        consumerId: '12324',
        businessUnitId: 'err',
        errResp: error,
      });
      throw error;
    }
  }

  @UseGuards(WebhookGuard('WS_HOMNIFI_SECRET_KEY'))
  @Post('user/membership')
  async handleMembershipWebhook(@Body() webhookDto: CheckMembershipDto) {
    let webhookRequestId: any;
    const newTrack = await this.webhookService.createIsMembershipWebhook({
      payload: webhookDto,
    });

    if (!newTrack._id) {
      throw new HttpException('Failed to create webhook', 400);
    }
    try {
      webhookRequestId = newTrack._id;
      //Check the webhook Data is valid or not
      const { validateStatus, userId, membership_expirey, isMembership } =
        await this.webhookService.checkMembershipWebhookValidation(
          webhookDto,
          webhookRequestId,
        );
      console.log(membership_expirey, 'membership_expirey');

      if (validateStatus) {
        //Function for member ship status
        const data = await this.usersService.updateMembership(
          userId,
          membership_expirey,
          isMembership,
          webhookDto.subscription_type,
        );

        if (!data) {
          await this.webhookService.createIsMembershipWebhook({
            payload: webhookDto,
            type: WebhookType.MEMBER_SHIP_STATUS,
            message: WebhookMessages.MEMBER_SHIP_STATEUS,
            status: WebhookDataStatus.FAILED,
            webhookRequestId,
          });
          throw new BadRequestException(WebhookMessages.MEMBER_SHIP_STATEUS);
        }

        const webhookResponseData = {
          requestId: webhookRequestId,
        };

        await this.webhookService.createIsMembershipWebhook({
          payload: webhookDto,
          type: WebhookType.MEMBER_SHIP_STATUS,
          message: WebhookMessages.MEMBER_SHIP_STATEUS_COMPLETE,
          status: WebhookDataStatus.SUCCESS,
          webhookRequestId,
        });
        return new ApiResponse(
          webhookResponseData,
          `MemberShip Updated Successfully`,
        );
      } else {
        await this.webhookService.createIsMembershipWebhook({
          payload: webhookDto,
          type: WebhookType.MEMBER_SHIP_UNEXPECTED_ERROR,
          message: WebhookMessages.MEMBER_SHIP_UNEXPECTED_ERROR,
          status: WebhookDataStatus.FAILED,
          webhookRequestId,
        });
        throw new BadRequestException(
          WebhookMessages.MEMBER_SHIP_UNEXPECTED_ERROR,
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      await this.webhookService.createIsMembershipWebhook({
        payload: webhookDto,
        type: WebhookType.MEMBER_SHIP_UNEXPECTED_ERROR,
        message: error.message || WebhookMessages.MEMBER_SHIP_UNEXPECTED_ERROR,
        status: WebhookDataStatus.FAILED,
        webhookRequestId,
      });
      throw new InternalServerErrorException('Failed to process webhook', {
        cause: error,
        description: error.message || 'An unexpected error occurred',
      });
    }
  }

  @UseGuards(WebhookGuard('WS_HOMNIFI_SECRET_KEY'))
  @Post('machine/track/status')
  async updateMachineTracking(@Body() dto: MachineTrackingWebhookDto) {
    try {
      const resp = await this.machineTrackingService.updateMachineTracking(dto);
      return new ApiResponse(resp, 'Status updated');
    } catch (error) {
      throw error;
    }
  }

  // @UseGuards(WebhookGuard('HOMNIFI_CLOUDK_SECRET_KEY'))
  @Post('delivery-fee')
  async calculateDeliveryFee(@Body() dto: DeliveryFeeWebhookDto) {
    try {
      const resp = await this.webhookService.calculateDeliveryFeeWebhook(dto);
      return new ApiResponse(resp, 'Status updated');
    } catch (error) {
      throw error;
    }
  }
}
