import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';
import { WebhookDto } from './dto/webhook.dto';
import {
  WebhookDataStatus,
  WebhookMessages,
  WebhookPlatform,
  WebhookType,
} from './enums/webhook.enum';
import { WebhookModel } from './schemas/webhookModel.schema';
import { Platform } from '../platform/schemas/platform.schema';
import { createHmac } from 'crypto';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import axios, { AxiosResponse } from 'axios';
import { HttpService } from '@nestjs/axios';
import { TrustpilotWebhookModel } from './schemas/trustpilotModel.schema';
import { CheckMembershipDto } from './dto/check-membership.dto';
import { UsersService } from '../users/users.service';
import { MembershipWebhookModel } from './schemas/membershipWebhookModel.schema';
import { User } from '../users/schemas/user.schema';
import {
  getDateOrNull,
  getMembershipDetails,
  isMembershipValid,
} from '../utils/common/common.functions';
import * as Minio from 'minio';
import { DeliveryFeeWebhookDto } from './dto/webhook.delivery-fee.dto';
import { CloudKMachine } from '../cloud-k/schemas/cloudk-machine.schema';
@Injectable()
export class WebhookService {
  private minioClient: Minio.Client;
  constructor(
    @InjectModel(WebhookModel.name, 'webhook')
    private readonly webhookModel: Model<WebhookModel>,

    @InjectModel(MembershipWebhookModel.name, 'webhook')
    private readonly membershipWebhookModel: Model<MembershipWebhookModel>,

    @InjectModel(Platform.name)
    private readonly platformModel: Model<Platform>,
    private readonly httpService: HttpService,

    @InjectModel(CloudKMachine.name)
    private cloudKMachine: Model<CloudKMachine>,
    // @InjectModel(TrustpilotWebhookModel.name)
    // private readonly trustpilotWebhookModel: Model<TrustpilotWebhookModel>,

    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) {
    this.minioClient = new Minio.Client({
      endPoint: 'object-app.kmall.io',
      useSSL: true,
      accessKey: process.env.S3_BUCKET_ACCESS_KEY,
      secretKey: process.env.S3_BUCKET_SECRET_KEY,
    });
  }

  async createWebhook({
    payload,
    platform,
    type,
    status,
    webhookRequestId,
    message,
  }: {
    payload: Record<string, any>;
    platform?: string;
    type?: WebhookType;
    status?: WebhookDataStatus;
    webhookRequestId?: Types.ObjectId;
    message?: WebhookMessages | string;
  }) {
    const createwebhookModalEntry = await this.webhookModel.create({
      type,
      payload,
      status,
      platform,
      webhookRequestId,
      message,
    });
    if (!createwebhookModalEntry) {
      throw new BadRequestException(WebhookMessages.UNEXPECTED);
    }
    return createwebhookModalEntry;
  }

  async checkWebhookValidation(
    webhookDto: Record<string, any>,
    platform: string,
    webhookRequestId?: Types.ObjectId,
  ): Promise<boolean> {
    try {
      //Check Order Id Duplication
      const isDuplicateOrder = await this.webhookModel
        .findOne({
          'payload.order_id': webhookDto.order_id,
          status: WebhookDataStatus.SUCCESS,
          type: WebhookType.COMPLETED,
          platform,
        })
        .exec();
      const iSPlatformExists = await this.platformModel
        .findOne({
          symbol: { $regex: new RegExp(`^${platform}$`, 'i') },
          status: 'active',
          deletedAt: null,
        })
        .exec();
      if (isDuplicateOrder) {
        await this.createWebhook({
          payload: webhookDto,
          type: WebhookType.ORDERID,
          status: WebhookDataStatus.FAILED,
          message: WebhookMessages.ORDERID,
          webhookRequestId: webhookRequestId,
          platform,
        });
        throw new BadRequestException(WebhookMessages.ORDERID);
      } else if (!iSPlatformExists) {
        await this.createWebhook({
          payload: webhookDto,
          type: WebhookType.PLATFORM,
          status: WebhookDataStatus.FAILED,
          message: WebhookMessages.PLATFORM,
          webhookRequestId: webhookRequestId,
          platform,
        });
        throw new BadRequestException(WebhookMessages.PLATFORM);
      } else {
        return true;
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new Error(error);
    }
  }

  async checkDepositWebhookValidation(
    webhookDto: Record<string, any>,
    platform: string,
    webhookRequestId?: Types.ObjectId,
  ): Promise<any> {
    try {
      // Check if the platform exists
      const isPlatformExists = await this.platformModel.findOne({
        symbol: { $regex: new RegExp(`^${platform}$`, 'i') },
        status: 'active',
        deletedAt: null,
      });
      if (!isPlatformExists) {
        await this.createWebhook({
          payload: webhookDto,
          type: WebhookType.PLATFORM,
          status: WebhookDataStatus.FAILED,
          message: WebhookMessages.PLATFORM,
          webhookRequestId: webhookRequestId,
          platform,
        });
        throw new BadRequestException(WebhookMessages.PLATFORM);
      }

      const hashArray = Array.isArray(webhookDto.hash)
        ? webhookDto.hash
        : [webhookDto.hash];

      let isAnyHashUnique = false;

      // Loop through the hashes and check for duplicates
      for (const hash of hashArray) {
        const isDuplicateHash = await this.webhookModel.findOne({
          'payload.hash': hash,
          status: WebhookDataStatus.SUCCESS,
          type: WebhookType.COMPLETED,
          platform,
        });
        if (!isDuplicateHash) {
          isAnyHashUnique = true;
        }
      }

      if (!isAnyHashUnique) {
        await this.createWebhook({
          payload: webhookDto,
          type: WebhookType.HASH,
          status: WebhookDataStatus.FAILED,
          message: WebhookMessages.HASH,
          webhookRequestId: webhookRequestId,
          platform,
        });
        throw new BadRequestException(WebhookMessages.HASH);
      }

      return { validateStatus: true, isPlatform: isPlatformExists };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new Error(error);
    }
  }

  async CreateWebhookOrder(
    webhookDto: WebhookDto,
    webhookRequestId?: Types.ObjectId,
  ) {
    const createWebhookOrderData = await this.createWebhook({
      payload: webhookDto,
      type: WebhookType.COMPLETED,
      status: WebhookDataStatus.SUCCESS,
      webhookRequestId: webhookRequestId,
    });
    if (!createWebhookOrderData) {
      await this.createWebhook({
        payload: webhookDto,
        type: WebhookType.CREATE,
        status: WebhookDataStatus.FAILED,
        webhookRequestId: webhookRequestId,
      });
      throw new BadRequestException(WebhookMessages.CREATE);
    }
    return createWebhookOrderData;
  }

  async getTrustpilotAccessToken() {
    const apiUrl = `${process.env.TRUSTPILOT_BASE_URL}/oauth/oauth-business-users-for-applications/accesstoken`;
    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('client_id', process.env.TRUSTPILOT_API_KEY);
    params.append('client_secret', process.env.TRUSTPILOT_SECRET);
    params.append('username', process.env.TRUSTPILOT_USERNAME);
    params.append('password', process.env.TRUSTPILOT_PASSWORD);

    const response: AxiosResponse<any> = await lastValueFrom(
      this.httpService.post(apiUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }),
    );
    return response.data;
  }

  async checkMembershipWebhookValidation(
    webhookDto: CheckMembershipDto,
    webhookRequestId?: Types.ObjectId,
  ): Promise<{
    validateStatus: boolean;
    userId: mongoose.Schema.Types.ObjectId | Types.ObjectId;
    membership_expirey: Date;
    isMembership: boolean;
  }> {
    try {
      const { bid, expireDate } = webhookDto;

      // 1. Check if the bid exists in the user collection
      const userExists = await this.userModel.findOne({ blockchainId: bid });

      if (!userExists) {
        await this.createWebhook({
          payload: webhookDto,
          type: WebhookType.BID,
          status: WebhookDataStatus.FAILED,
          message: `User with bid ${bid} not found`,
          webhookRequestId,
        });
        throw new BadRequestException(`User with bid ${bid} not found`);
      }

      if (expireDate) {
        // const membershipExpiry = await getDateOrNull(expireDate);
        // const isMembership = await isMembershipValid(membershipExpiry);
        const { membership_Date, IsMembership } =
          await getMembershipDetails(expireDate);
        if (!membership_Date) {
          await this.createIsMembershipWebhook({
            payload: webhookDto,
            type: WebhookType.MEMBER_SHIP_EXPIRE_DATE,
            status: WebhookDataStatus.FAILED,
            message: 'Invalid membership ExpireDate format',
            webhookRequestId,
          });
          throw new BadRequestException(
            'Invalid membership expire date format',
          );
        }
        if (!IsMembership) {
          await this.createIsMembershipWebhook({
            payload: webhookDto,
            type: WebhookType.MEMBER_SHIP_EXPIRE_DATE,
            status: WebhookDataStatus.FAILED,
            message: 'membership expireDate must be a future date',
            webhookRequestId,
          });
          throw new BadRequestException(
            'membership expireDate must be a future date',
          );
        }
        return {
          validateStatus: true,
          userId: userExists._id as Types.ObjectId,
          membership_expirey: membership_Date,
          isMembership: IsMembership,
        };
      } else {
        // 2. Check if the membership is valid
        await this.createIsMembershipWebhook({
          payload: webhookDto,
          type: WebhookType.MEMBER_SHIP_EXPIRE_DATE,
          status: WebhookDataStatus.FAILED,
          message: 'Invalid membership ExpireDate',
          webhookRequestId,
        });
        throw new BadRequestException('Invalid membership expire date format');
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new Error(error);
    }
  }

  async createIsMembershipWebhook({
    payload,
    type,
    status,
    webhookRequestId,
    message,
  }: {
    payload: Record<string, any>;
    type?: WebhookType;
    status?: WebhookDataStatus;
    webhookRequestId?: Types.ObjectId;
    message?: WebhookMessages | string;
  }) {
    const createwebhookModalEntry = await this.membershipWebhookModel.create({
      type,
      payload,
      status,
      webhookRequestId,
      message,
    });

    if (!createwebhookModalEntry) {
      throw new BadRequestException(WebhookMessages.UNEXPECTED);
    }
    return createwebhookModalEntry;
  }

  async calculateDeliveryFeeWebhook(
    deliveryFeeWebhookDto: DeliveryFeeWebhookDto,
  ) {
    try {
      const { bid, orderId, externalId, deliveryFeePaid, platform } =
        deliveryFeeWebhookDto;

      // const webhookRequestId: any;

      const newTrack = await this.createWebhook({
        payload: deliveryFeeWebhookDto,
        platform,
      });

      if (!newTrack._id) {
        throw new HttpException('Failed to create webhook', 400);
      }
      const webhookRequestId = newTrack._id;
      const userExists = await this.userModel.findOne({ blockchainId: bid });

      if (!userExists) {
        await this.createWebhook({
          payload: deliveryFeeWebhookDto,
          type: WebhookType.BID,
          platform: platform,
          status: WebhookDataStatus.FAILED,
          message: `User with bid ${bid} not found`,
        });
        throw new BadRequestException(`User with bid ${bid} not found`);
      }

      const highestCollateralMachine = await this.cloudKMachine
        .findOne({
          user: userExists._id,
          orderId: orderId,
          externalMachineId: externalId,
        })
        .sort({ collateral: -1 });

      if (!highestCollateralMachine) {
        await this.createWebhook({
          payload: deliveryFeeWebhookDto,
          platform: platform,
          type: WebhookType.MACHINE_HIGHTEST_COLLATORAL_ERROR,
          status: WebhookDataStatus.FAILED,
          message: `Machine with orderId ${orderId} and externalId ${externalId} not found`,
        });
        throw new BadRequestException(
          `Machine with orderId ${orderId} and externalId ${externalId} not found`,
        );
      }

      highestCollateralMachine.deliveryFeePaid = deliveryFeePaid;
      await highestCollateralMachine.save();

      await this.createWebhook({
        payload: deliveryFeeWebhookDto,
        type: WebhookType.COMPLETED,
        platform: platform,
        webhookRequestId: webhookRequestId,
        status: WebhookDataStatus.SUCCESS,
        message: `Delivery Fee Paid for Machine with orderId ${orderId} and externalId ${externalId}`,
      });
      return {
        message: `Delivery Fee Paid for Machine with orderId ${orderId} and externalId ${externalId}`,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new Error(error);
    }
  }
}
