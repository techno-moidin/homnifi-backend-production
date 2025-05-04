import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Device } from './schemas/device.schema';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { aggregatePaginate } from '../utils/pagination.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { pagination, toObjectId } from '../utils/helpers';
import { Types } from 'mongoose';

@Injectable()
export class DeviceService {
  constructor(@InjectModel(Device.name) private deviceModel: Model<Device>) { }

  async registerDevice(registerDeviceDto: RegisterDeviceDto) {
    const { userId, deviceName, browserName, ip, deviceType, os, osVersion } =
      registerDeviceDto;
    if (!userId) {
      throw new HttpException('User id is null', HttpStatus.BAD_REQUEST);
    }
    try {
      let locationData;
      try {
        locationData = await this.getLocationByIp(ip);
      } catch (error) {
        console.warn(
          'Unable to fetch location data, proceeding with null values',
        );
      }
      const device = await this.deviceModel.create({
        user: userId,
        deviceName: deviceName,
        browserName: browserName,
        deviceId: uuidv4(),
        ipAddress: ip,
        os,
        osVersion,
        deviceType,
        location: {
          country: locationData?.country || null,
          region: locationData?.region || null,
          city: locationData?.city || null,
          latitude: locationData?.latitude || null,
          longitude: locationData?.longitude || null,
          timezone: locationData?.timezone || null,
        },
        recentActivity: new Date(),
      });
      return device;
    } catch {
      // TODO:
      // send email to Admin
    }
  }

  async getUserDevices2(id: string, page: any, limit: any) {
    if (!id) {
      throw new HttpException('User id is null', HttpStatus.BAD_REQUEST);
    }

    const whereConfig = {
      user: id,
      isLoggedIn: true,
    };

    const paginate = await pagination({
      page,
      pageSize: limit,
      model: this.deviceModel,
      condition: whereConfig,
      pagingRange: 5,
    });

    const devices = await this.deviceModel
      .find(whereConfig)
      .sort({
        recentActivity: -1,
      })
      .skip(paginate.offset)
      .limit(paginate.limit);

    return {
      list: devices,
      totalCount: paginate.total,
      totalPages: paginate.metadata.page.totalPage,
      currentPage: paginate.metadata.page.currentPage,
    };
  }

  async getUserDevices(id: string, page: any, limit: any) {
    if (!id) {
      throw new HttpException('User id is null', HttpStatus.BAD_REQUEST);
    }
    const pipeline = [
      {
        $match: {
          user: id,
          isLoggedIn: true,
        },
      },
      {
        $sort: {
          recentActivity: -1,
        },
      },
    ];
    return await aggregatePaginate(this.deviceModel, pipeline, page, limit);
  }

  private async getLocationByIp(ip: string): Promise<any> {
    const url = `https://ipapi.co/${ip}/json`;
    try {
      const response = await axios.get(`${url}`);
      return response.data;
    } catch (error) {
      throw new Error('Unable to fetch location data');
    }
  }

  async updateDeviceById(deviceId: string, updateData) {
    await this.deviceModel.findOneAndUpdate({ deviceId }, updateData, {
      new: true,
    });
  }
  // old code for logout all devices
  async logoutAllDevices(userId: string) {
    await this.deviceModel.updateMany({ user: userId }, { isLoggedIn: false });
  }

  async logoutAllDevicesV1(userId: string) {
    await this.deviceModel.updateMany({ user: new Types.ObjectId(userId) }, { isLoggedIn: false });
  }
}
