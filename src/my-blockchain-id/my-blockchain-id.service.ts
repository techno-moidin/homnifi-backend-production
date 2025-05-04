import { HttpException, Injectable } from '@nestjs/common';
import { LoginDto, RegisterUserDto } from '../auth/dto/auth.dto';
import { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import {
  MBID_BASE_URL,
  MBID_GET_USER_INFO,
  MBID_USER_LOGIN_URL,
  MBID_USER_REGISTER_URL,
} from './my-blockchain-id.routes';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { ActiveUserTree } from '../users/schemas/active-user-tree.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import path from 'path';
import * as fs from 'fs';
import { CacheService } from '../cache/cache.service';
import { BlockSupernodeUserDto } from '../admin/dto/block.user.dto';

@Injectable()
export class MyBlockchainIdService {
  constructor(
    private readonly httpService: HttpService,
    private userService: UsersService,
    private configService: ConfigService,
    private emailService: EmailService,
    private cacheService: CacheService,
  ) {}

  onModuleInit() {
    this.httpService.axiosRef.defaults.baseURL = this.configService.get(
      'TWO_ACCESS_BASE_URL',
    );
  }

  filterErrorResponse(response) {
    const arrayResponse = [];

    for (const key in response) {
      if (response.hasOwnProperty(key)) {
        if (typeof response[key] === 'string') {
          arrayResponse.push(`${response[key]}`);
        } else {
          response[key].forEach((message) => {
            arrayResponse.push(message);
          });
        }
      }
    }

    console.log(
      '🚀 ~ MyBlockchainIdService ~ filterErrorResponse ~ arrayResponse:',
      arrayResponse,
    );
    return { message: arrayResponse, error: response };
  }

  decodeJwt(token: string) {
    const [header, _payload, _signature] = token.split(':');
    const headerPayload = Buffer.from(header, 'base64').toString('utf8');
    return JSON.parse(headerPayload);
  }

  async createUser(registerUserDto: RegisterUserDto): Promise<any> {
    try {
      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService.post(MBID_USER_REGISTER_URL, registerUserDto, {
          timeout: 20000, // increase request timeout is 20 seconds
        }),
      );

      // send mail here
      this.emailService.signup(
        registerUserDto.email,
        registerUserDto.username,
        new Date().toDateString(),
        'Welcome to Homnifi',
        'Your Gateway to Web3 and Decentralized Finance',
      );

      return response.data;
    } catch (error) {
      // throw new HttpException(
      //   this.filterErrorResponse(error.response.data),
      //   error.response?.status,
      // );

      if (error.response.status < 500)
        throw new HttpException(
          this.filterErrorResponse(error.response.data),
          400,
        );

      throw error;
    }
  }

  async loginUser(loginDto: LoginDto): Promise<any> {
    try {
      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService.post(MBID_USER_LOGIN_URL, loginDto),
      );

      const { loginToken } = response.data;

      const decoded: any = this.decodeJwt(loginToken);

      const user = await this.userService.getOrCreateUserByBID(
        decoded.user_id,
        decoded.user_email,
      );

      return {
        user: user,
        bidData: response.data,
      };
    } catch (error) {
      if (error.response.status < 500)
        throw new HttpException(
          this.filterErrorResponse(error.response.data),
          400,
        );

      throw error;
    }
  }

  async syncUserByBid(userBId: string): Promise<any> {
    const user = await this.userService.findUserByBlockchainId(userBId);
    if (user) return user;

    const apiKey = process.env.TWO_ACCESS_TP_KEY;
    try {
      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService.get(
          `${process.env.TWO_ACCESS_BASE_URL}/api/v1/tp/users/${userBId}/`,
          {
            headers: {
              Authorization: `Client ${apiKey}`,
              // baseUrl: MBID_BASE_URL,
            },
          },
        ),
      );
      if (!response) {
        return null;
      }
      const data = response.data;
      const newUser = await this.userService.getOrCreateUserByBID(
        data.id,
        data.email,
        data?.username,
        data?.firstName,
        data?.lastName,
        data?.profilePicture,
      );
      return newUser;
    } catch (error) {
      if (error?.response?.data?.detail == 'Not found.') {
        return null;
      }
      throw new HttpException(
        this.filterErrorResponse(error.response.data),
        error.response?.status,
      );
    }
  }

  async syncUserUplineByBid(userBId: string): Promise<any> {
    const apiKey = process.env.TWO_ACCESS_TP_KEY;
    try {
      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService.get(
          `${process.env.TWO_ACCESS_BASE_URL}/api/v1/tp/users/${userBId}/upline/active-membership/`,
          {
            headers: {
              Authorization: `Client ${apiKey}`,
              // baseUrl: MBID_BASE_URL,
            },
          },
        ),
      );
      const data = response.data;

      if (!data.found) {
        return null;
      }

      const checkUser = await this.userService.findUserByBlockchainId(
        data.upline.id,
      );
      if (checkUser) return checkUser;

      const newUser = await this.userService.getOrCreateUserByBID(
        data.upline.id,
        data.upline.email,
        data?.username,
        data?.firstName,
        data?.lastName,
        data?.profilePicture,
      );
      return newUser;
    } catch (error) {
      throw new HttpException(
        this.filterErrorResponse(error.response.data),
        error.response?.status,
      );
    }
  }

  async createExportRequest() {
    const apiKey = process.env.TWO_ACCESS_TP_KEY;
    console.log(
      '🚀 ~ MyBlockchainIdService ~ createExportRequest ~ apiKey:',
      apiKey,
    );
    try {
      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService.post(
          `${process.env.TWO_ACCESS_BASE_URL}/api/v1/tp/users/export-structure/`,
          {
            return_username: true,
            only_members: true,
            return_email: true,
          },
          {
            headers: {
              Authorization: `Client ${apiKey}`,
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      console.log(
        '🚀 ~ MyBlockchainIdService ~ createExportRequest ~ error:',
        error,
      );
      throw new Error(error.response.data);
    }
  }

  async getUserExportDetails(exportId?: string) {
    try {
      const apiKey = process.env.TWO_ACCESS_TP_KEY;
      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService.get(
          `${process.env.TWO_ACCESS_BASE_URL}/api/v1/tp/users/exports/${exportId}`,
          {
            headers: {
              Authorization: `Client ${apiKey}`,
            },
          },
        ),
      );
      return response.data;
    } catch (error) {
      throw new HttpException(
        error.response?.data?.detail,
        error.response?.status,
      );
    }
  }

  async getExportUserList(limit: number = 50000) {
    try {
      const exportRequestResponse = await this.createExportRequest();
      console.log(
        '🚀 ~ MyBlockchainIdService ~ getExportUserList ~ exportRequestResponse:',
        exportRequestResponse,
      );
      const exportId = exportRequestResponse.id;

      let exportDetails;
      const pollInterval = 2000;
      const maxRetries = 30;

      const chunksDir = path.join(__dirname, '../../tmp/exported-chunks');

      if (!fs.existsSync(chunksDir)) {
        fs.mkdirSync(chunksDir, { recursive: true });
      }

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        exportDetails = await this.getUserExportDetails(exportId);

        if (exportDetails.status === 'COMPLETED') {
          const fileUrl = exportDetails.file;
          const fileResponse = await firstValueFrom(
            this.httpService.get(fileUrl),
          );

          console.log({
            length: fileResponse.data.length,
          });

          if (fileResponse.data.length > 0) {
            // Remove all existing TreeUser entries before adding new ones
            await this.userService.removeAllTreeUsers();
            // await this.cacheService.resetCache();
          }

          const data = fileResponse.data;

          const chunkFileNames = [];
          console.log(
            'data.length / limit',
            Math.ceil(data.length / limit),
            data.length,
            limit,
          );

          for (let i = 0; i < data.length / limit; i++) {
            const chunk = data.slice(i * limit, (i + 1) * limit);
            const chunkFileName = `chunk-${i + 1}.json`;
            const chunkFilePath = path.join(
              __dirname,
              `../../tmp/exported-chunks/${chunkFileName}`,
            );

            fs.writeFileSync(chunkFilePath, JSON.stringify(chunk, null, 2));

            chunkFileNames.push(chunkFileName);
          }

          return chunkFileNames;
        }

        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }

      throw new Error('Export process did not complete in a timely manner');
    } catch (error) {
      console.log(
        '🚀 ~ MyBlockchainIdService ~ getExportUserList ~ error:',
        error,
      );
      throw new Error(`Error in getting export user list: ${error.message}`);
    }
  }

  async get2AcessDelegateToken(userBid) {
    const apiKey = process.env.TWO_ACCESS_TP_KEY;
    try {
      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService.post(
          `${process.env.TWO_ACCESS_BASE_URL}/api/v1/tp/users/${userBid}/generate-delegate-token/`,
          {},
          {
            headers: {
              Authorization: `Client ${apiKey}`,
            },
          },
        ),
      );

      return response.data?.token;
    } catch (error) {
      throw new Error(error.response.data);
    }
  }

  async get2AcessUserToken(token) {
    const tokenapiKey = process.env.TWO_ACCESS_TP_KEY;
    try {
      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService.post(
          `${process.env.TWO_ACCESS_BASE_URL}/api/v1/auth/delegate/login/`,
          { token },
          {},
        ),
      );
      return response.data?.token;
    } catch (error) {
      throw new Error(error.response.data);
    }
  }

  async updateSupernodeUserStatus(
    blockSupernodeUserDto: BlockSupernodeUserDto,
  ): Promise<any> {
    const token = process.env.TWO_ACCESS_TOKEN;
    try {
      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService.post(
          `${process.env.TWO_ACCESS_BASE_URL}/api/v1/admin/users/super-node/update/`,
          blockSupernodeUserDto,
          {
            headers: {
              Authorization: `Token ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );
      const data = response.data;
      return data;
    } catch (error) {
      throw new HttpException(
        this.filterErrorResponse(error.response.data),
        error.response?.status,
      );
    }
  }
}
