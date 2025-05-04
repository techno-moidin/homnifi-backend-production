import { Test, TestingModule } from '@nestjs/testing';
import { DeviceController } from './device.controller';
import { DeviceService } from './device.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetDevicesDTO } from './dto/get.devices.dto';
import ApiResponse from '../utils/api-response.util';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('DeviceController', () => {
  let controller: DeviceController;
  let service: DeviceService;

  beforeEach(async () => {
    const mockDeviceService = {
      getUserDevices: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeviceController],
      providers: [
        {
          provide: DeviceService,
          useValue: mockDeviceService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<DeviceController>(DeviceController);
    service = module.get<DeviceService>(DeviceService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUserDevices', () => {
    it('should return user devices successfully', async () => {
      const mockUserId = 'mockUserId';
      const mockDevices = [
        {
          deviceId: 'device1',
          browserName: 'Chrome',
          deviceName: 'User PC',
          token: 'some-token',
          isLoggedIn: true,
          user: mockUserId,
          ipAddress: '127.0.0.1',
          location: { city: 'New York', country: 'USA' },
          recentActivity: new Date(),
          deviceType: 'PC',
          os: 'Windows',
          osVersion: '10',
        },
      ];
      const req = { user: { userId: mockUserId } };
      const query: GetDevicesDTO = { page: 1, limit: 10 };

      jest.spyOn(service, 'getUserDevices').mockResolvedValue(mockDevices);

      const result = await controller.getUserDevices(req, query);

      expect(service.getUserDevices).toHaveBeenCalledWith(
        mockUserId,
        query.page,
        query.limit,
      );
      expect(result).toEqual(
        new ApiResponse(mockDevices, 'User devices returned successfully!'),
      );
    });
  });
});
