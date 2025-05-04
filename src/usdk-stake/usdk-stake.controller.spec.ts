import { Test, TestingModule } from '@nestjs/testing';
import { UsdkStakeController } from './usdk-stake.controller';

describe('UsdkStakeController', () => {
  let controller: UsdkStakeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsdkStakeController],
    }).compile();

    controller = module.get<UsdkStakeController>(UsdkStakeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
