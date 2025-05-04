import { Test, TestingModule } from '@nestjs/testing';
import { OtpTokensService } from './otp-tokens.service';

describe('OtpTokensService', () => {
  let service: OtpTokensService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OtpTokensService],
    }).compile();

    service = module.get<OtpTokensService>(OtpTokensService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
