import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import ApiResponse from '../utils/api-response.util';
import { inspect } from 'util';

import {
  KMALL_CREATE_WALLET,
  KMALL_HOT_WALLET_BALANCE,
  KMALL_REWARD_FILE,
  KMALL_VALIDATE_ADDRESS,
  KMALL_VOUCHER_DATA,
  KMALL_WALLET_BALANCE,
} from './kmall.routes';
import { InjectModel } from '@nestjs/mongoose';
import { Network } from '../token/schemas/network.schema';
import { Model, Types } from 'mongoose';
import { NetworkI } from '../token/interfaces/network.interface';
import { mainTokenSymbol } from '../global/constants';
import { RequestWithdrawOnExternalAppDto } from '../wallet/dto/request-withdraw-on-external-app.dto';
import {
  REQUEST_WITHDRAW_ON_EXTERNAL_APP_ENDPOINT,
  YOUR_TWO_FACTOR_AUTH_ENDPOINT,
} from '../global/routes/external.app.routes';
import { PlatformVoucher } from '../platform-voucher/schemas/platform-voucher.schema';
import { log } from 'handlebars';
import { User } from '../users/schemas/user.schema';
@Injectable()
export class KMallService {
  constructor(
    @InjectModel(Network.name) private readonly networkModel: Model<NetworkI>,
    @InjectModel(User.name) private readonly UserModel: Model<User>,
    @InjectModel(PlatformVoucher.name)
    private platformVoucherModel: Model<PlatformVoucher>,
    private readonly httpService: HttpService,
  ) { }

  // onModuleInit() {
  //   this.httpService.axiosRef.defaults.baseURL = process.env.KMALL_BASE_URL;
  //   this.httpService.axiosRef.defaults.headers.common['X-API-KEY'] =
  //     process.env.KMALL_API_KEY;
  //   this.httpService.axiosRef.defaults.headers.common['platform'] =
  //     'CUBE_WALLET';
  // }

  async createKMallWallet(networkCode): Promise<{
    // network: Types.ObjectId;
    address: string;
  }> {
    try {
      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService.post(
          process.env.KMALL_BASE_URL + KMALL_CREATE_WALLET,
          {
            network: networkCode,
          },
          {
            headers: {
              'X-API-KEY': process.env.KMALL_API_KEY,
              platform: process.env.KMALL_PLATFORM,
            },
          },
        ),
      );

      return {
        address: response.data.data.data.address,
      };
    } catch (error) {
      throw new HttpException(error.response.data, error.response?.status);
    }
  }

  async createPbPayWallet(walletRequestPayload): Promise<{
    address: string;
  }> {
    try {
      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService.post(
          process.env.KMALL_BASE_URL + '/partner/payments/pb-pay/session',
          walletRequestPayload,
          {
            headers: {
              'x-api-key': process.env.PB_PAY_API_KEY,
              platform: process.env.PB_PAY_PLATFORM,
            },
          },
        ),
      );
      return {
        address: response.data?.data?.data?.address,
      };
    } catch (error) {
      throw new HttpException(error.response.data, error.response?.status);
    }
  }

  async getWalletBalance(address: string) {
    try {
      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService.get(
          process.env.KMALL_BASE_URL + KMALL_WALLET_BALANCE,
          {
            params: {
              coin: mainTokenSymbol,
              address: address,
              network: 'matic',
            },
            headers: {
              'X-API-KEY': process.env.KMALL_API_KEY,
              platform: process.env.KMALL_PLATFORM,
            },
          },
        ),
      );
      return response.data;
    } catch (error) {
      throw new HttpException(error.response.data, error.response?.status);
    }
  }

  async callVoucherAPI(productId, userBId, quantity, orderId, idempotencyKey) {
    const apiUrl = `${process.env.KMALL_BASE_URL}/purchases/${orderId}/vouchers`;
    try {
      const response = await lastValueFrom(
        this.httpService.get(apiUrl, {
          headers: {
            'X-API-KEY': process.env.KMALL_VOUCHERS_X_API_KEY,
            platform: process.env.KMALL_VOUCHERS_PLATFORM,
          },
        }),
      );

      let responseData = response.data;
      responseData = Array.isArray(responseData)
        ? responseData[0]
        : responseData;

      const { vouchers } = responseData;
      if (Array.isArray(vouchers) && vouchers.length > 0) {
        const parsedFromProductId = responseData.productId?.split(' ') || [];
        for (const voucher of vouchers) {
          await this.platformVoucherModel.create([
            {
              title: responseData.type || responseData.productId || '-',
              userBID: userBId,
              orderId,
              productId: productId,
              validity: responseData.validity || parsedFromProductId[1] || '-',
              type: responseData.type || parsedFromProductId[0] || '-',
              vouchers: voucher,
              code: responseData.code
                ? responseData.code
                : orderId + 'x' + productId,
            },
          ]);
        }
      } else {
      }
    } catch (apiError) {
      await this.platformVoucherModel.create({
        title: '-',
        description: apiError.message,
        userBID: userBId,
        orderId,
        productId: productId,
        validity: '-',
        type: '-',
        vouchers: '-',
        code: '',
        status: 'inactive',
        deletedAt: new Date(),
      });
    }
  }

  async validateAddress(address: string, network: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          process.env.KMALL_BASE_URL + KMALL_VALIDATE_ADDRESS,
          {
            network,
            address,
          },
          {
            headers: {
              'X-API-KEY': process.env.KMALL_API_KEY,
              platform: process.env.KMALL_PLATFORM,
            },
          },
        ),
      );
      return response.data?.data?.data?.valid ?? false;
    } catch (error) {
      return false;
    }
  }

  async requestWithdrawOnExternalApp(
    requestWithdrawOnExternalAppDto: RequestWithdrawOnExternalAppDto,
  ) {
    const supportedAssets = [
      'lyk-matic',
      'lyk-erc20',
      'lyk-arbitum',
      'usdt-trc20',
      'clfi-matic',
      'slyk-matic',
      'mlyk-matic',
    ];
    const asset = requestWithdrawOnExternalAppDto.asset;
    // if (!supportedAssets.includes(asset)) {
    //   throw new HttpException('Invalid asset for withdrawal', 400);
    // }

    console.log({ requestWithdrawOnExternalAppDto });

    try {
      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService.post(
          process.env.KMALL_BASE_URL +
          REQUEST_WITHDRAW_ON_EXTERNAL_APP_ENDPOINT,
          requestWithdrawOnExternalAppDto,
          {
            headers: {
              'X-API-KEY': process.env.KMALL_API_KEY,
              platform: process.env.KMALL_PLATFORM,
            },
          },
        ),
      );
      return response.data;
    } catch (error) {
      throw new HttpException('Error connecting to wallet service', 400);
    }
  }

  async getHotWalletBalance() {
    try {
      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService.get(
          process.env.KMALL_BASE_URL + KMALL_HOT_WALLET_BALANCE,
          {
            headers: {
              'X-API-KEY': process.env.KMALL_API_KEY,
              platform: process.env.KMALL_PLATFORM,
            },
          },
        ),
      );
      return response?.data || {};
    } catch (error) {
      if (error.response) {
        throw new HttpException(error.response.data, error.response.status);
      } else if (error.request) {
        throw new HttpException(
          'No response received',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      } else {
        throw new HttpException(
          'Error fetching hot wallet balance',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  async getVoucherData(userBid: any) {
    try {
      const userData = await this.UserModel.findOne({
        _id: userBid,
      }).exec();
      const blockchainId = userData.blockchainId;
      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService.get(
          process.env.KMALL_BASE_URL + KMALL_VOUCHER_DATA + `${blockchainId}`,
          {
            headers: {
              'X-API-KEY': process.env.KMALL_API_KEY,
              platform: process.env.KMALL_PLATFORM_VOCUHER,
            },
          },
        ),
      );

      return response;
    } catch (error) {
      throw new HttpException('Error fetching voucher details', 400);
    }


  }

  async uploadRewardFile(name: any) {
    try {

      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService.post(
          process.env.KMALL_BASE_URL + KMALL_REWARD_FILE, {
          name: name,
        },
          {
            headers: {
              'X-API-KEY': process.env.KMALL_API_KEY,
              platform: process.env.KMALL_PLATFORM_VOCUHER,
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      throw new HttpException('Error fetching voucher details', 400);
    }
  }
}
