import {
  Controller,
  Get,
  Delete,
  Param,
  Req,
  Query,
  Post,
  UseGuards,
} from '@nestjs/common';
import { DeviceService } from './device.service';
import ApiResponse from '../utils/api-response.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetDevicesDTO } from './dto/get.devices.dto';

@Controller('device')
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getUserDevices(@Req() req: any, @Query() query: GetDevicesDTO) {
    const userId = req?.user?.userId;
    const userDevices = await this.deviceService.getUserDevices2(
      userId,
      query.page,
      query.limit,
    );
    return new ApiResponse(userDevices, 'User devices returned successfully!');
  }

  //   @Post()
  //   async createDevice(@Req() req: any) {
  //     return this.deviceService.registerDevice(
  //       'req.user.id',
  //       req,
  //       "req.headers.authorization?.split(' ')[1]",
  //     );
  //   }
  // @Get('test')
  // async checkDevice(@Req() req: any) {
  //   ;
  // }
}
