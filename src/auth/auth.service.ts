import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RegisterUserDto } from './dto/auth.dto';
import { Model, ObjectId, Schema, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcryptjs';
import { OTP_TOKEN_TYPES } from '../otp-tokens/schemas/otp-tokens.schema';
import { OtpTokensService } from '../otp-tokens/otp-tokens.service';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/schemas/user.schema';
import { MyBlockchainIdService } from '../my-blockchain-id/my-blockchain-id.service';
import ApiResponse from '../utils/api-response.util';
import { DeviceService } from '../device/device.service';
import { AppRequest } from '../utils/app-request';
import { NotificationService } from '../notification/notification.service';
import { NotificationTypeEnum } from '../notification/enums/notification.type.enum';
import { toObjectId } from '../utils/helpers';
import { ImpersonateDto } from '../admin/dto/impersonate.dto';
import {
  IMPERSONALTE_STATUS,
  ImpersonateHistroty,
} from '../admin/schemas/impersonate-histroty.schema';
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import { IMPERSONATE, JWT_SECRET_IMPERSONATE_TOKEN } from '../utils/constants';
import { WalletGatewayService } from '../wallet-gateway/wallet-gateway.service';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @InjectModel(User.name) private userModel: Model<User>,
    private notificationService: NotificationService,
    private emailService: EmailService,
    private verificationCodeService: OtpTokensService,
    private userService: UsersService,
    @Inject(ConfigService) private config: ConfigService,
    private myBlockchainIdService: MyBlockchainIdService,
    private deviceService: DeviceService,
    @InjectModel(ImpersonateHistroty.name)
    private impersonateHistrotyModel: Model<ImpersonateHistroty>,
    private readonly walletService: WalletService,
  ) { }

  generateJwt(payload) {
    return this.jwtService.sign(payload, {
      expiresIn: '24h',
      secret: this.config.get<string>('JWT_SECRET'),
    });
  }

  async hashPassword(password: string) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  }

  async signIn(req, user) {
    const loginData = await this.myBlockchainIdService.loginUser(user);
    // console.log, 'loginData', loginData;
    const device = user.device;

    const deviceName =
      device.name && device.version
        ? `${device.name} ${device.version}`.trim()
        : req['deviceName'];

    const createdDevice = await this.deviceService.registerDevice({
      userId: loginData?.user?.id,
      deviceName,
      browserName: req['browserName'],
      deviceType: req['deviceType'],
      os: req['os'],
      osVersion: req['osVersion'],
      ip: req.ipAddress,
    });

    const accessToken = this.generateJwt({
      blockchainId: loginData.user.blockchainId,
      userId: loginData.user.id,
      email: loginData.user.email,
      deviceId: createdDevice?.deviceId,
    });

    if (createdDevice) {
      await this.deviceService.updateDeviceById(createdDevice.deviceId, {
        token: accessToken,
      });
    }
    const notificationMessage =
      req['deviceName'] !== undefined
        ? `You have successfully logged in from ${deviceName}`
        : 'You have successfully logged in';

    await this.notificationService.create(
      {
        title: 'Device Logged In',
        message: notificationMessage,
        type: NotificationTypeEnum.DEVICE_LOGGED_IN,
      },
      toObjectId(loginData?.user?.id),
    );

    // Ensure zero balance wallets are created for the user if not exists
    await this.walletService.createWalletsIfNotExist(loginData?.user?.id);
    // console.log('loginData', loginData);
    return new ApiResponse({
      ...loginData.bidData,
      username: loginData.user?.username,
      dateJoined: loginData.user?.dateJoined,
      accessToken,
    });
  }

  async registerUser(user: RegisterUserDto) {
    const bIdRegisterData = await this.myBlockchainIdService.createUser(user);
    return new ApiResponse(bIdRegisterData);
  }

  async findUserByEmail(email) {
    const user = await this.userModel.findOne({ email });

    if (!user) {
      return null;
    }

    return user;
  }

  async signOut(req) {
    await this.deviceService.updateDeviceById(req.user.deviceId, {
      isLoggedIn: false,
    });

    return new ApiResponse('Logged out successfully');
  }

  async logoutFromAllDevices(token: string, accessToken: string) {
    if (!token && !accessToken) {
      return new ApiResponse('Token is required');
    }

    const decoded = token
      ? this.decodeJwt(token)
      : this.jwtService.decode(accessToken);
    const userId = token ? decoded.user_id : decoded.blockchainId;

    const user = await this.userService.findUserByBlockchainId(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    await this.deviceService.logoutAllDevicesV1(user._id.toString());
    return new ApiResponse('Logged out from all devices successfully');
  }

  decodeJwt(token: string) {
    try {
      const [header, _payload, _signature] = token.split(':');
      const headerPayload = Buffer.from(header, 'base64').toString('utf8');
      return JSON.parse(headerPayload);
    } catch (error) {
      throw new SyntaxError('Invalid JSON in JWT');
    }
  }

  async getImpersonateToken(impersonateDto: ImpersonateDto) {
    const bid = impersonateDto.bid;
    const user = await this.userModel.findOne({ blockchainId: bid });

    if (!user) {
      throw new NotFoundException(
        'User not found with the provided blockchainId',
      );
    }

    const impersonate = await this.impersonateHistrotyModel.create({
      user: user._id,
      admin: impersonateDto.admin,
      reason: impersonateDto.reason,
    });

    const token = this.jwtService.sign(
      {
        id: impersonate._id,
        admin: impersonate.admin,
      },
      {
        expiresIn: '60000',
        secret: this.config.get<string>(JWT_SECRET_IMPERSONATE_TOKEN),
      },
    );
    return token;
  }

  async getImpersonateTokens(impersonate: ImpersonateHistroty) {
    try {
      const user = await this.userModel.findOne({ _id: impersonate.user });
      const homnifiAccessToken = this.generateJwt({
        blockchainId: user.blockchainId,
        userId: user.id,
        email: user.email,
        mode: IMPERSONATE,
        admin: impersonate.admin,
      });
      if (!homnifiAccessToken) {
        throw new Error('Failed to generate homnifi access token');
      }
      const twoAcessDelegateToken =
        await this.myBlockchainIdService.get2AcessDelegateToken(
          user.blockchainId,
        );
      if (!twoAcessDelegateToken) {
        throw new Error('Failed to retrieve 2Acess Delegate token');
      }

      const twoAcessUserToken =
        await this.myBlockchainIdService.get2AcessUserToken(
          twoAcessDelegateToken,
        );
      if (!twoAcessUserToken) {
        throw new Error('Failed to retrieve 2Acess user token');
      }
      const userObj = user.toObject() as any;
      userObj.isImpersonateMode = true;
      impersonate.status = IMPERSONALTE_STATUS.LOGGED_IN;
      await impersonate.save();
      return {
        homnifiAccessToken,
        twoAcessUserToken,
        user: userObj,
      };
    } catch (error) {
      throw new Error(error);
    }
  }

  async getImpersonate(impersonateId: string) {
    return await this.impersonateHistrotyModel.findOne({
      _id: new Types.ObjectId(impersonateId),
    });
  }
}
