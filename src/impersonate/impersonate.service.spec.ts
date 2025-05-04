import { Test, TestingModule } from '@nestjs/testing';
import { ImpersonateService } from './impersonate.service';
import { AuthService } from '../auth/auth.service';
import { getModelToken } from '@nestjs/mongoose';
import { ImpersonateLog } from './schemas/impersonate-log.schema';
import { ImpersonateHistroty } from '../admin/schemas/impersonate-histroty.schema';
import { Types } from 'mongoose';

describe('ImpersonateService', () => {
  let service: ImpersonateService;
  let authService: AuthService;

  beforeEach(async () => {
    const mockAuthService = {
      getImpersonateTokens: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImpersonateService,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: getModelToken(ImpersonateLog.name),
          useValue: {
            aggregate: jest.fn().mockReturnValue({
              paginate: jest.fn().mockResolvedValue([]),
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ImpersonateService>(ImpersonateService);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('verifiImpersonate', () => {
    it('should call AuthService.getImpersonateTokens with correct parameter', () => {
      const mockImpersonate = {
        user: new Types.ObjectId() as any,
        admin: new Types.ObjectId() as any,
        reason: 'test-reason',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as ImpersonateHistroty;

      service.verifiImpersonate(mockImpersonate);

      expect(authService.getImpersonateTokens).toHaveBeenCalledWith(
        mockImpersonate,
      );
    });
  });
});
