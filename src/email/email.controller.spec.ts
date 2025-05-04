import { Test, TestingModule } from '@nestjs/testing';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import ApiResponse from '../utils/api-response.util';
import { Response } from 'express';

describe('EmailController', () => {
  let controller: EmailController;
  let service: EmailService;

  beforeEach(async () => {
    const mockEmailService = {
      renderTemplate: jest.fn(),
      deposit: jest.fn(),
      withdrawl: jest.fn(),
      sendWithdrawalProcessedEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailController],
      providers: [
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    controller = module.get<EmailController>(EmailController);
    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getTemplate', () => {
    it('should return rendered template', async () => {
      const res = {
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as unknown as Response;
      const mockHtml = '<html><body>Test Template</body></html>';
      jest.spyOn(service, 'renderTemplate').mockResolvedValue(mockHtml);

      await controller.getTemplate('testTemplate', res);

      expect(service.renderTemplate).toHaveBeenCalledWith(
        'testTemplate',
        expect.any(Object),
      );
      expect(res.send).toHaveBeenCalledWith(mockHtml);
    });

    it('should handle errors while rendering template', async () => {
      const res = {
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as unknown as Response;
      jest
        .spyOn(service, 'renderTemplate')
        .mockRejectedValue(new Error('Render error'));

      await controller.getTemplate('testTemplate', res);

      expect(service.renderTemplate).toHaveBeenCalledWith(
        'testTemplate',
        expect.any(Object),
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith('Error rendering template');
    });
  });

  describe('withdrawl', () => {
    it('should return email sent successfully response', async () => {
      const res = {
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as unknown as Response;
      jest.spyOn(service, 'withdrawl').mockResolvedValue(undefined);

      const result = await controller.withdrawl(res);

      expect(service.withdrawl).toHaveBeenCalled();
      expect(result).toEqual(new ApiResponse({}, 'Email sent successfully'));
    });

    it('should handle errors during withdrawl', async () => {
      const res = {
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as unknown as Response;
      jest
        .spyOn(service, 'withdrawl')
        .mockRejectedValue(new Error('Withdrawl error'));

      await controller.withdrawl(res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith('Error rendering template');
    });
  });
});
