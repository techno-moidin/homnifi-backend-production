import { Test, TestingModule } from '@nestjs/testing';
import { ImpersonateController } from './impersonate.controller';
import { ImpersonateService } from './impersonate.service';
import { ImpersonateGuard } from './impersonate.guard';

describe('ImpersonateController', () => {
  let controller: ImpersonateController;
  let service: ImpersonateService;

  beforeEach(async () => {
    const mockService = {
      verifiImpersonate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImpersonateController],
      providers: [
        {
          provide: ImpersonateService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(ImpersonateGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .compile();

    controller = module.get<ImpersonateController>(ImpersonateController);
    service = module.get<ImpersonateService>(ImpersonateService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('verifyImpersonate', () => {
    it('should call ImpersonateService.verifiImpersonate with correct parameter', () => {
      const mockReq = { impersonate: { id: 'test-id' } };
      controller.verifyImpersonate(mockReq);

      expect(service.verifiImpersonate).toHaveBeenCalledWith(
        mockReq.impersonate,
      );
    });
  });
});
