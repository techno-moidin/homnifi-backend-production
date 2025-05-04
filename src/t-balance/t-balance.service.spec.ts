import { Test, TestingModule } from '@nestjs/testing';
import { TBalanceService } from './t-balance.service';

describe('TBalanceService', () => {
  let service: TBalanceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TBalanceService],
    }).compile();

    service = module.get<TBalanceService>(TBalanceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
