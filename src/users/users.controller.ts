import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Req,
  UseGuards,
  Query,
  Post,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { AppRequest } from '../utils/app-request';
import { TrustpilotUserDTO, UpdateUserDto } from './dto/update-user.dto';
import ApiResponse from '../utils/api-response.util';
import { Types } from 'mongoose';
import { UpdateEmailUserDto } from '@/src/users/dto/update-email-user.dto';

@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UsersService) {}

  @Put('')
  async updateUser(
    @Req() req: AppRequest,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const data = await this.userService.updateUser(
      req.user.userId,
      updateUserDto,
    );
    return new ApiResponse(data);
  }

  @Put('email/change')
  async updateUserEmail(
    @Req() req: AppRequest,
    @Body() emailUserDto: UpdateEmailUserDto,
  ) {
    const data = await this.userService.updateUserEmail(
      req.user.userId,
      emailUserDto,
    );
    return new ApiResponse(data, 'Email updated successfully.');
  }

  @Post('trustpilot/redirect')
  async redirectToTrustpilot(@Body() trustpilotUserDto: TrustpilotUserDTO) {
    const data = await this.userService.redirectToTrustpilot(trustpilotUserDto);
    return new ApiResponse(data, 'Request sent successfully.');
  }

  @Get('membership/:bid')
  async getMembershipStatus(@Param('bid') bid: string) {
    const data = await this.userService.findUserMembershipByBid(bid);
    return new ApiResponse(data);
  }

  @Get('uplineUser')
  async getuplineUser(
    @Param('userId') userId: string,
    @Param('depth') depth: number,
  ) {
    const data = await this.userService.getUplineUsers(
      new Types.ObjectId(userId),
      5,
    );
    return new ApiResponse(data);
  }

  @Get('profile')
  async findUserProfileById(@Req() req: any) {
    const userId = req.user.userId;
    const userData = await this.userService.findUserById(userId);
    if (!userData) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const response = {
      email: userData.email,
      blockchainId: userData.blockchainId,
      uplineBID: userData.uplineBID,
      uplineId: userData.uplineId,
      username: userData.username,
      firstName: userData.firstName,
      lastName: userData.lastName,
      isBuilderGenerationActive: userData.isBuilderGenerationActive,
      isBaseReferralActive: userData.isBaseReferralActive,
      profilePicture: userData.profilePicture,
      dateJoined: userData.dateJoined,
      rewardMultiplier: userData.rewardMultiplier,
      lastLogin: userData.lastLogin,
      isBaseReferralEnabled: userData.isBaseReferralEnabled,
      isBuilderGenerationEnabled: userData.isBuilderGenerationEnabled,
      isBuilderReferralEnabled: userData.isBuilderReferralEnabled,
      isUserEverPurchasedMachine: userData.isUserEverPurchasedMachine,
      products: userData.products,
      totalBuilderGenarational: userData.totalBuilderGenarational,
      firstLineBuilderGenerational: userData.firstLineBuilderGenerational,
      totalUserwithMachine: userData.totalUserwithMachine,
      totalUserwithMembership: userData.totalUserwithMembership,
      totalUserwithoutMachine: userData.totalUserwithoutMachine,
      totalUserwithoutMembership: userData.totalUserwithoutMembership,
      totalBaseReferral: userData.totalBaseReferral,
      firstLineBaseReferral: userData.firstLineBaseReferral,
      firstLineNode: userData.firstLineNode,
      totalNode: userData.totalNode,
      isMembership: userData.isMembership,
      referralCode: userData.referralCode,
      trustpilotReviewed: userData.trustpilotReviewed,
      isTomoConditionAccepted: userData.isTomoConditionAccepted,
      isBlocked: userData.isBlocked,
      blockReason: userData.blockedReason,
      unblockedReason: userData.unblockedReason,
    };

    return new ApiResponse(
      response,
      'User profile details fetched successfully',
    );
  }

  @Get('user-completion-steps')
  async getUserCompletionSteps(@Req() req: any) {
    const userId = req.user.userId;

    const data = await this.userService.userVerificationSteps(
      new Types.ObjectId(userId),
    );
    return new ApiResponse(data);
  }
}
