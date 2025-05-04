import {
  Controller,
  Req,
  Post,
  UseGuards,
  Body,
  Headers,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { TransformInterceptor } from '../interceptor/transform.interceptor';
import {
  LoginDto,
  RegisterUserDto,
  ResetPasswordDto,
  ResetPasswordRequestDto,
  VerifyEmailDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AppRequest } from '../utils/app-request';
import { BlockGuard } from '../admin/auth/guards/user.block.guard';

// @UseInterceptors(LoggingInterceptor)
// @UseInterceptors(TransformInterceptor)
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  async create(@Body() createUserDto: RegisterUserDto) {
    return await this.authService.registerUser(createUserDto);
  }

  @Post('signin')
  @UseGuards(BlockGuard)
  async signIn(@Req() req: any, @Body() loginDto: LoginDto) {
    return await this.authService.signIn(req, loginDto);
  }

  @Post('signout')
  @UseGuards(JwtAuthGuard)
  async signOut(@Req() req: AppRequest) {
    return await this.authService.signOut(req);
  }

  @Post('signout-from-all-devices')
  async logoutFromAllDevices(
    @Query('token') token: string,
    @Query('accessToken') accessToken: string,
  ) {
    return await this.authService.logoutFromAllDevices(token, accessToken);
  }
}
