import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformService } from './platform.service';
import { UserSetFavoritePlatformDto } from './dto/user.set.favorite.platform.dto';
import { UserEnrollPlatformDto } from './dto/user.enroll.platform.dto';
import { UserFilterPlatformDTO } from './dto/user.filter.paltform.dto';
import mongoose, { Types } from 'mongoose';
import ApiResponse from '../utils/api-response.util';
import { CreateAdDto } from './dto/create-ad.dto';
import { KMallService } from '../k-mall/kmall.service';
import { log } from 'handlebars';

@UseGuards(JwtAuthGuard)
@Controller('platform')
export class PlatformController {
  constructor(
    private readonly platformService: PlatformService,
    private readonly kmallService: KMallService,
  ) {}

  @Get('')
  async getPlatforms(@Req() req: any) {
    const userId = req?.user?.userId;
    return this.platformService.getPlatforms(userId);
  }

  //Favorite platforms handlers
  @Post('favorite')
  async setPlatformAsFavorite(
    @Req() req: any,
    @Query() setFavoritePlatformDto: UserSetFavoritePlatformDto,
  ) {
    const userId = req?.user?.userId;
    setFavoritePlatformDto['user'] = new mongoose.Types.ObjectId(userId);
    return this.platformService.setPlatformAsFavorite(setFavoritePlatformDto);
  }

  @Get('favorite')
  async getFavoritePlatforms(
    @Req() req: any,
    @Query() filterPlatformDto: UserFilterPlatformDTO,
  ) {
    const userId = req?.user?.userId;
    return this.platformService.getFavoritePlatforms(userId, filterPlatformDto);
  }

  //Enroll platforms handlers
  @Post('enroll')
  async ernollPlatform(
    @Req() req: any,
    @Query() userEnrollPlatformDto: UserEnrollPlatformDto,
  ) {
    const userId = req?.user?.userId;
    userEnrollPlatformDto['user'] = userId;
    return this.platformService.enrollPlatform(userEnrollPlatformDto);
  }

  @Get('enroll')
  async getEnrolledPlatforms(
    @Req() req: any,
    @Query() filterPlatformDto: UserFilterPlatformDTO,
  ) {
    const userId = req?.user?.userId;
    return this.platformService.getEnrolledPlatforms(userId, filterPlatformDto);
  }

  //Featured platforms handlers
  @Get('featured')
  async getFeaturedPlatforms(
    @Req() req: any,
    @Query() filterPlatformDto: UserFilterPlatformDTO,
  ) {
    const userId = req?.user?.userId;
    return this.platformService.getFeaturedPlatforms(userId, filterPlatformDto);
  }

  @Get('ads')
  async getPlatformAds() {
    const data = await this.platformService.getPlatformAds();
    return new ApiResponse(data);
  }

  @Get('voucher')
  async getVoucherData(@Req() req: any) {
    const userBid = req.user.userId;
    const data = await this.kmallService.getVoucherData(
      new Types.ObjectId(userBid),
    );
    
    return new ApiResponse(data.data);
  }
}
