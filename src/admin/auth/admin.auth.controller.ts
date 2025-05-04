import {
  Controller,
  Post,
  Body,
  Req,
  Param,
  Get,
  UseGuards,
  Query,
  UnprocessableEntityException,
} from '@nestjs/common';
import ApiResponse from '@/src/utils/api-response.util';
import { AdminAuthService } from './admin.auth.service';
import {
  AdminSigninDto,
  AdminSignupDto,
  AdminVerifyDto,
  ForgotPasswordDto,
  ForgotPasswordRequestDto,
} from './dto/admin.auth.dto';
import { AdminGuard } from './guards/admin.guard';
import { SIGNOUT_ALL_DEVICE_MODE } from './enums/admin.account.status.enum';
import { AuthenticationGuard } from './guards/auth.guard';

import { TFAGuard } from './guards/TFA.guard';
import { AppRequest } from '@/src/utils/app-request';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private adminService: AdminAuthService) {}
  @UseGuards(AuthenticationGuard)
  @Post('signin')
  async adminSignin(@Body() adminLoginDto: AdminSigninDto) {
    return new ApiResponse(await this.adminService.signin(adminLoginDto));
  }

  @Post('signup')
  @UseGuards(AdminGuard)
  @UseGuards(TFAGuard)
  async adminSignup(
    @Req() req: AppRequest,
    @Body() adminSigninDto: AdminSignupDto,
  ) {
    if (!req.admin.isSuperAdmin) {
      throw new UnprocessableEntityException(
        'You are not authorized to create new admin',
      );
    }
    return new ApiResponse(
      await this.adminService.signup(adminSigninDto),
      'Admin Created Successfully',
    );
  }
  @UseGuards(AuthenticationGuard)
  @Post('verify')
  async adminVerify(@Body() AdminVerifyDto: AdminVerifyDto) {
    return new ApiResponse(await this.adminService.verify(AdminVerifyDto));
  }
  @UseGuards(AuthenticationGuard)
  @Post('forgot-password/request')
  async forgotPasswordRequest(
    @Body() forogtPasswordRequestDto: ForgotPasswordRequestDto,
  ) {
    return await this.adminService.forgotPasswordRequest(
      forogtPasswordRequestDto.email,
    );
  }
  @UseGuards(AuthenticationGuard)
  @Post('forgot-password')
  async forgotPassword(@Body() forogtPasswordDto: ForgotPasswordDto) {
    return await this.adminService.forgotPassword(
      forogtPasswordDto.token,
      forogtPasswordDto.newPassword,
      forogtPasswordDto.confirmPassword,
    );
  }

  @Get('verify-token/:token')
  async verifyTokenLink(@Param('token') token: string) {
    return await this.adminService.verifyTokenLink(token);
  }
  @Post('signout')
  @UseGuards(AdminGuard)
  async adminSignout(@Req() req: AppRequest) {
    // Only log relevant parts of the request
    console.log('SIGNOUT REQ Headers: ', JSON.stringify(req.headers));
    console.log('SIGNOUT REQ Admin: ', JSON.stringify(req.admin));
    console.log('SIGNOUT REQ ID: ', JSON.stringify(req.id));
    const adminId = req?.admin?._id || req?.admin?.id;
    return new ApiResponse(await this.adminService.signOutV2(adminId, req));
  }
  // signout from  all devices
  @Post('signout-from-all-devices')
  async adminSignoutFromAllDevice(
    @Req() req: any,
    @Query('mode') mode: string,
  ) {
    return new ApiResponse(
      await this.adminService.adminSignoutFromAllDevice(req, mode),
    );
  }

  @Post('verify2fa')
  async twoFAVerify(@Body() adminVerifyDto: AdminVerifyDto) {
    return new ApiResponse(await this.adminService.verify2fa(adminVerifyDto));
  }
}
