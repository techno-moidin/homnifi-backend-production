import { Test, TestingModule } from '@nestjs/testing';
import { TBalanceController } from './t-balance.controller';

describe('TBalanceController', () => {
  let controller: TBalanceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TBalanceController],
    }).compile();

    controller = module.get<TBalanceController>(TBalanceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
