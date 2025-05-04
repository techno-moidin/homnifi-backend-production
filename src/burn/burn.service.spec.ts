import { Test, TestingModule } from '@nestjs/testing';
import { BurnService } from './burn.service';

describe('BurnService', () => {
  let service: BurnService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BurnService],
    }).compile();

    service = module.get<BurnService>(BurnService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
