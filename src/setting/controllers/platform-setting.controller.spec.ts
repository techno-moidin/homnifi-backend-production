import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from '../setting.service';
import { PlatformSettingController } from './platform-setting.controller';

describe('PlatformSettingController', () => {
  let controller: PlatformSettingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlatformSettingController],
      providers: [SettingsService],
    }).compile();

    controller = module.get<PlatformSettingController>(
      PlatformSettingController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
