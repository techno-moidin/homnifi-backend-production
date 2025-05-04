import { Test, TestingModule } from '@nestjs/testing';
import { MaintenanceService } from './maintenance.service';
import { getModelToken } from '@nestjs/mongoose';
import { MainTenance } from './schema/maintenance.schema';
import { BadRequestException } from '@nestjs/common';

describe('MaintenanceService', () => {
  let service: MaintenanceService;
  let model: any;

  beforeEach(async () => {
    const mockModel = {
      updateMany: jest.fn(),
      create: jest.fn(),
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceService,
        {
          provide: getModelToken(MainTenance.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<MaintenanceService>(MaintenanceService);
    model = module.get(getModelToken(MainTenance.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should mark existing maintenance as solved and create new maintenance', async () => {
      model.updateMany.mockResolvedValue({});
      model.create.mockResolvedValue({ id: '1' });

      const dto = { name: 'New Maintenance' };
      const result = await service.create(dto);

      expect(model.updateMany).toHaveBeenCalledWith(
        { solvedAt: { $eq: null } },
        {
          $set: {
            deletedAt: expect.any(Date),
            deletedMethod: 'SYSTEM',
          },
        },
      );
      expect(model.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: '1' });
    });
  });

  describe('getMaintenance', () => {
    it('should return current maintenance', async () => {
      const mockMaintenance = { id: '1', name: 'Maintenance1' };
      model.findOne.mockResolvedValue(mockMaintenance);

      const result = await service.getMaintenance();

      expect(model.findOne).toHaveBeenCalledWith({
        startDateTime: { $lte: expect.any(Date) },
        endDateTime: { $gte: expect.any(Date) },
        solvedAt: null,
      });
      expect(result).toEqual(mockMaintenance);
    });
  });

  describe('createMaintenance', () => {
    it('should create maintenance with adjusted dates', async () => {
      model.create.mockResolvedValue({ id: '1' });

      const dto = {
        startDateTime: '2023-10-01T00:00:00Z',
        endDateTime: '2023-10-01T23:59:59Z',
        name: 'Test Maintenance',
      };

      const result = await service.createMaintenance(dto);

      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Maintenance',
          startDateTime: expect.any(String),
          endDateTime: expect.any(String),
        }),
      );
      expect(result).toEqual({ id: '1' });
    });

    it('should throw BadRequestException on failure', async () => {
      model.create.mockRejectedValue(new Error('Creation failed'));

      const dto = { name: 'Test Maintenance' };

      await expect(service.createMaintenance(dto)).rejects.toThrow(
        new BadRequestException('Failed to create maintenance entry'),
      );
    });
  });

  describe('getAllMaintenance', () => {
    it('should return paginated maintenance', async () => {
      const mockPaginatedResult = { docs: [], total: 0 };
      jest
        .spyOn(service, 'getAllMaintenance')
        .mockResolvedValue(mockPaginatedResult);

      const result = await service.getAllMaintenance({ page: 1, limit: 10 });

      expect(result).toEqual(mockPaginatedResult);
    });
  });

  describe('stopMintenance', () => {
    it('should stop maintenance successfully', async () => {
      model.findByIdAndUpdate.mockResolvedValue({ id: '1' });

      const result = await service.stopMintenance('1');

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        {
          $set: {
            solvedAt: expect.any(Date),
            solvedMethod: 'ADMIN',
          },
        },
        { new: true },
      );
      expect(result.message).toBe('Maintenance stopped successfully');
    });
  });
});
