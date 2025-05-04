import { ObjectId, Types } from 'mongoose';
import { AdminJWTPayload } from '@/src/interface/admin-jwt-playload';
import { JWT_SECRET_ADMIN } from '@/src/utils/constants';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AdminService } from '../admin.service';
import { AdminBinding } from '../dto/admin.binding';
import { Admin } from '../schemas/admin.schema';
import {
  AdminSigninDto,
  AdminSignupDto,
  AdminVerifyDto,
} from './dto/admin.auth.dto';
import { EmailService } from '@/src/email/email.service';
import { MailerService } from '@nestjs-modules/mailer';
import * as bcrypt from 'bcryptjs';
import { UpdateAdminDTO } from '../dto/update.admin.dto';
import ApiResponse from '@/src/utils/api-response.util';
import { AdminOtpTokensService } from '../admin-otp-token/admin-otp-tokens.service';
import { OTP_TOKEN_TYPES } from '../admin-otp-token/schemas/admin-otp-tokens.schema';
import { CacheService } from '@/src/cache/cache.service';
import { CACHE_TYPE } from '@/src/cache/Enums/cache.enum';
import { SIGNOUT_ALL_DEVICE_MODE } from './enums/admin.account.status.enum';
import { TwoFAService } from './admin-2fa.service';

@Injectable()
export class AdminAuthService {
  constructor(
    private adminService: AdminService,
    private jwtService: JwtService,
    private twoFAService: TwoFAService,
    private emailService: EmailService,
    private adminOtpTokenService: AdminOtpTokensService,
    private cacheService: CacheService,

    private readonly configService: ConfigService,
  ) {}

  async signup(adminSignupDTO: AdminSignupDto) {
    return await this.adminService.createAdmin(adminSignupDTO);
  }
  async signin(adminLoginDto: AdminSigninDto) {
    // console.log('Signin Request:', adminLoginDto);

    const admin: any = await this.adminService.findByEmail(adminLoginDto.email);
    if (!admin) {
      throw new HttpException('Admin not found', HttpStatus.BAD_REQUEST);
    }

    const matchPassword = await this.adminService.comparePassword(
      admin,
      adminLoginDto.password,
    );
    // console.log('Password Match:', matchPassword);

    if (!matchPassword) {
      throw new HttpException('Invalid Credentials', HttpStatus.BAD_REQUEST);
    }
    const secret = this.configService.get<string>(JWT_SECRET_ADMIN);
    const emailToken = await this.jwtService.signAsync(
      { email: admin.email },
      { secret },
    );

    const result = await this.adminOtpTokenService.createVerificationCode(
      admin,
      OTP_TOKEN_TYPES.LOGIN_VERIFICATION,
      null,
      null,
      emailToken,
    );

    this.emailService.adminLoginEmail(admin, result.code);
    return new ApiResponse({
      message: 'OTP has been send successfully!',
      token: emailToken,
    });
  }

  async verify(adminVerifyDto: AdminVerifyDto) {
    const userData = this.jwtService.decode<{ email: string }>(
      adminVerifyDto.token,
    );
    const admin: any = await this.adminService.findByEmail(userData.email);
    if (!admin) {
      throw new HttpException('Admin not found', HttpStatus.BAD_REQUEST);
      // throw new BadRequestException('Invalid email or password');
    }

    if (process.env.NODE_ENV === 'production') {
      const result: any = await this.adminOtpTokenService.checkIfCodeIsValid(
        adminVerifyDto.code,
        admin._id,
        OTP_TOKEN_TYPES.LOGIN_VERIFICATION,
      );
      if (!result) {
        new Error('Invalid Code');
      }

      await this.adminOtpTokenService.markCodeAsUsed(result._id);
    }

    const secret = this.configService.get<string>(JWT_SECRET_ADMIN);
    const tempToken = await this.jwtService.signAsync(
      { email: admin.email },
      { secret },
    );

    let twoFaData: Record<any, any> = {};
    if (!admin.is2faEnabled) {
      const qr = await this.twoFAService.generate2Fa(admin.email);

      await this.adminService.add2faSecret(admin._id, qr.secret);
      twoFaData = qr;
    }

    const result = await this.adminOtpTokenService.createVerificationCode(
      admin,
      OTP_TOKEN_TYPES.TWO_FA_VERIFICATION,
      '00002fa',
      null,
      tempToken,
    );

    return new ApiResponse({
      message: 'Email verification successful. Please Verify 2FA ',
      token: tempToken,
      ...twoFaData,
    });
  }

  async verify2fa(adminVerifyDto: AdminVerifyDto) {
    const userData = this.jwtService.decode<{ email: string }>(
      adminVerifyDto.token,
    );
    const admin: any = await this.adminService.findByEmail(userData.email);

    if (!admin) {
      throw new HttpException('Admin not found', HttpStatus.BAD_REQUEST);
      // throw new BadRequestException('Invalid email or password');
    }

    if (process.env.NODE_ENV !== 'qa-server') {
      const result: any = await this.adminOtpTokenService.checkIfCodeIsValid(
        '00002fa', // Dummy code. we don't want check this. since we have 2fa
        admin._id,
        OTP_TOKEN_TYPES.TWO_FA_VERIFICATION,
      );
      if (!result) {
        throw new UnauthorizedException();
      }

      const verified = await this.twoFAService.verify2Fa(
        adminVerifyDto.code,
        admin.toObject().TFASecret,
      );

      if (!verified) {
        throw new UnprocessableEntityException(
          'Invalid 2fa verification code.',
        );
      }
      this.adminService.set2faEnabled(admin._id, true);
      await this.adminOtpTokenService.markCodeAsUsed(result._id);
    }

    if (
      process.env.NODE_ENV === 'qa-server' &&
      adminVerifyDto.code !== '123456'
    ) {
      throw new UnprocessableEntityException('Invalid 2fa verification code.');
    }

    const payload: AdminJWTPayload = {
      id: String(admin._id),
      username: admin.username,
      fullname: admin.firstName + ' ' + admin.lastName,
      email: admin.email,
      role: String(admin.role),
      passwordChangedAt: admin.passwordChangedAt,
    };
    const secret = this.configService.get<string>(JWT_SECRET_ADMIN);
    const accessToken = await this.jwtService.signAsync(payload, { secret });
    const adminInfo = new AdminBinding(admin);

    const adminCacheData = await this.cacheService.getCacheUser({
      type: CACHE_TYPE.ADMIN_USER,
      user: String(admin._id),
    });
    if (Array.isArray(adminCacheData)) {
      adminCacheData.push(accessToken);
      await this.cacheService.setCacheUser(
        {
          type: CACHE_TYPE.ADMIN_USER,
          user: String(admin._id),
          data: adminCacheData,
        },
        7200000, // Two Hour Cache
      );
    } else {
      const addNewToken = [accessToken];
      await this.cacheService.setCacheUser(
        {
          type: CACHE_TYPE.ADMIN_USER,
          user: String(admin._id),
          data: addNewToken,
        },
        7200000, // Two Hour Cache
      );
    }
    return {
      accessToken,
      admin: adminInfo,
    };
  }

  async createToken(createdAdmin) {
    return await this.jwtService.sign(
      { id: createdAdmin._id },
      { expiresIn: '1h' },
    );
  }

  async forgotPasswordRequest(email: string) {
    const admin: any = await this.adminService.findByEmail(email);

    if (!admin) {
      throw new BadRequestException(`No admin found with email ${email}`);
    }

    const token = this.jwtService.sign({ id: admin._id }, { expiresIn: '1h' });

    const result = await this.adminOtpTokenService.createVerificationCode(
      admin,
      OTP_TOKEN_TYPES.RESET_PASSWORD,
      token,
      new Date(Date.now() + 5 * 60 * 1000),
    );

    const link = `${process.env.ADMIN_FRONTEND_URL}/auth/reset-password?token=${token}`;
    try {
      await this.emailService.forgotPasswordEmail(admin.firstName, email, link);
      const data = {
        message: 'Password reset link sent to your email!',
        token: token,
      };
      return new ApiResponse(data);
    } catch (error) {
      new Error('Invalid Email');
    }
  }

  async forgotPassword(
    token: string,
    newPassword: string,
    confirmPassword: string,
  ) {
    if (newPassword !== confirmPassword) {
      throw new Error('Passwords do not match');
    }
    try {
      const decoded = this.jwtService.verify(token);
      const admin: any = await this.adminService.findById(decoded.id);

      if (!admin) {
        throw new Error('Admin not found');
      }

      const result: any = await this.adminOtpTokenService.checkIfCodeIsValid(
        token,
        admin._id,
        OTP_TOKEN_TYPES.RESET_PASSWORD,
      );

      if (!result) {
        throw new Error('Invalid Code ');
      }
      await this.adminOtpTokenService.markCodeAsUsed(result._id);

      await this.adminService.updatePassword(admin.id, newPassword);

      // return { message: 'Password Chanage Success' };
      const data = {
        message: 'Password has been changed',
      };
      return new ApiResponse(data);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  async verifyTokenLink(token: string) {
    try {
      const decoded = this.jwtService.verify(token);
      const admin: any = await this.adminService.findById(decoded.id);

      if (!admin) {
        throw new Error('Admin not found');
      }

      const result: any = await this.adminOtpTokenService.checkIfCodeIsValid(
        token,
        admin._id,
        OTP_TOKEN_TYPES.RESET_PASSWORD,
      );

      if (!result) {
        throw new Error('Invalid Code ');
      }
      return new ApiResponse({ message: 'Code is Valid' });
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  //Signout service functionality
  // async signOut(adminId: string, req: any) {
  //   const adminCacheData = await this.cacheService.getCacheUser({
  //     type: CACHE_TYPE.ADMIN_USER,
  //     user: String(adminId),
  //   });
  //   console.log(adminCacheData, 'adminCacheData');

  //   if (adminCacheData) {
  //     const [type, token] = req.headers.authorization?.split(' ') ?? [];
  //     const currentToken = type === 'Bearer' ? token : undefined;

  //     let indexD: number;
  //     for (let index = 0; index < adminCacheData.length; index++) {
  //       const data = adminCacheData[index];
  //       if (JSON.stringify(data) == JSON.stringify(currentToken)) {
  //         indexD = index;
  //         break;
  //       }
  //     }
  //     delete adminCacheData[indexD];

  //     await this.cacheService.setCacheUser(
  //       {
  //         type: CACHE_TYPE.ADMIN_USER,
  //         user: String(adminId),
  //         data: adminCacheData,
  //       },
  //       7200000, // Two Hour Cache
  //     );
  //   }
  //   return 'Logged out successfully';
  // }
  async signOutV2(adminId: string, req: any) {
    try {
      console.log(`Attempting to sign out admin with ID: ${adminId}`);

      const adminCacheData = await this.cacheService.getCacheUser({
        type: CACHE_TYPE.ADMIN_USER,
        user: String(adminId),
      });

      console.log(`Retrieved cache data for admin ${adminId}:`, adminCacheData);

      if (adminCacheData && Array.isArray(adminCacheData)) {
        const [type, token] = req.headers.authorization?.split(' ') ?? [];
        const currentToken = type === 'Bearer' ? token : undefined;

        if (currentToken) {
          console.log(
            `Cache contains ${adminCacheData.length} tokens before filtering`,
          );

          // Debug: Log all tokens before filtering
          adminCacheData.forEach((cachedToken, index) => {
            console.log(
              `Token ${index}: Type: ${typeof cachedToken}, Value: ${JSON.stringify(cachedToken).substring(0, 20)}...`,
            );
          });

          // Use a more robust comparison
          const updatedCacheData = adminCacheData.filter((cachedToken) => {
            // If tokens are objects or have special formatting, stringify them
            const cachedTokenStr =
              typeof cachedToken === 'string'
                ? cachedToken
                : JSON.stringify(cachedToken);
            return cachedTokenStr.trim() !== currentToken.trim();
          });

          console.log(`Tokens after filtering: ${updatedCacheData.length}`);

          if (updatedCacheData.length !== adminCacheData.length) {
            console.log(`Token found and removed, updating cache`);

            if (updatedCacheData.length > 0) {
              // Update the cache with the filtered array
              console.log(
                `Setting cache with ${updatedCacheData.length} remaining tokens`,
              );
              const result = await this.cacheService.setCacheUser(
                {
                  type: CACHE_TYPE.ADMIN_USER,
                  user: String(adminId),
                  data: updatedCacheData,
                },
                7200000, // Two Hour Cache
              );
              console.log(`Cache update result:`, result);
            } else {
              // No more sessions - remove the entire cache entry
              console.log(`No remaining sessions, removing cache entry`);
              await this.cacheService.deleteUserCache({
                type: CACHE_TYPE.ADMIN_USER,
                user: String(adminId),
              });
            }
          } else {
            console.log(`No matching token found in cache data`);
          }
        } else {
          console.log(`No valid token found in request headers`);
        }
      } else {
        console.log(`No valid cache data found or cache is not an array`);
      }

      console.log(`Admin ${adminId} sign out process completed`);
      return 'Logged out successfully';
    } catch (error) {
      console.error(`Error during sign out for admin ${adminId}:`, error);
      throw error;
    }
  }

  async adminSignoutFromAllDevice(req: any, mode: string) {
    let adminId: string;
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    if (!token) {
      throw new UnauthorizedException();
    }
    if (mode == SIGNOUT_ALL_DEVICE_MODE.SIGNOUT) {
      const payload: AdminJWTPayload = await this.jwtService.verifyAsync(
        token,
        {
          secret: this.configService.get<string>(JWT_SECRET_ADMIN),
        },
      );

      const admin: any = await this.adminService.findById(payload.id);
      if (!admin) {
        throw new UnauthorizedException('Admin not found');
      }
      adminId = admin._id;
    } else {
      const decoded = await this.jwtService.verifyAsync(token);
      adminId = decoded.id;
    }

    const adminCacheData = await this.cacheService.getCacheUser({
      type: CACHE_TYPE.ADMIN_USER,
      user: String(adminId),
    });
    if (adminCacheData) {
      // await this.cacheService.setCacheUser(
      //   {
      //     type: CACHE_TYPE.ADMIN_USER,
      //     user: String(adminId),
      //     data: [],
      //   },
      //   7200000, // Two Hour Cache
      // ); // valid upto 24hr

      await this.cacheService.deleteUserCache({
        type: CACHE_TYPE.ADMIN_USER,
        user: String(adminId),
      });
    }
    return 'Logged out successfully';
  }
}
