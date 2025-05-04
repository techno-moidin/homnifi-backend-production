import { Test, TestingModule } from '@nestjs/testing';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';
import ApiResponse from '../utils/api-response.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Document } from 'mongoose';
import { MainTenance } from './schema/maintenance.schema';

describe('MaintenanceController', () => {
  let controller: MaintenanceController;
  let service: MaintenanceService;

  beforeEach(async () => {
    const mockService = {
      getMaintenance: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaintenanceController],
      providers: [
        {
          provide: MaintenanceService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<MaintenanceController>(MaintenanceController);
    service = module.get<MaintenanceService>(MaintenanceService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMaintenance', () => {
    it('should return maintenance when not in impersonate mode', async () => {
      const mockMaintenance = {
        id: '1',
        name: 'Maintenance1',
      } as unknown as Document<unknown, object, MainTenance> &
        MainTenance &
        Required<{ _id: unknown }>;
      jest.spyOn(service, 'getMaintenance').mockResolvedValue(mockMaintenance);

      const req = { user: { mode: 'NORMAL' } };
      const result = await controller.getMaintenance(req);

      expect(service.getMaintenance).toHaveBeenCalled();
      expect(result).toEqual(new ApiResponse(mockMaintenance));
    });

    it('should return null when in impersonate mode', async () => {
      const req = { user: { mode: 'IMPERSONATE' } };
      const result = await controller.getMaintenance(req);

      expect(result).toEqual(new ApiResponse(null));
    });
  });

  describe('getMaintenance3', () => {
    it('should return maintenance under authenticated request', async () => {
      const mockMaintenance = {
        id: '1',
        name: 'Maintenance1',
      } as unknown as Document<unknown, object, MainTenance> &
        MainTenance &
        Required<{ _id: unknown }>;
      jest.spyOn(service, 'getMaintenance').mockResolvedValue(mockMaintenance);

      const result = await controller.getMaintenance3();

      expect(service.getMaintenance).toHaveBeenCalled();
      expect(result).toEqual(new ApiResponse(mockMaintenance));
    });
  });
});
