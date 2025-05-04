import { Test, TestingModule } from '@nestjs/testing';
import { FaqController } from './faq.controller';
import { FaqService } from './faq.service';
import { FAQModulesEnum } from './enums/faq.modules';
import { FaqI } from './faq.interface';
import { Document, ObjectId, Types } from 'mongoose';

describe('FaqController', () => {
  let controller: FaqController;
  let service: FaqService;

  beforeEach(async () => {
    const mockFaqService = {
      findByModule: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FaqController],
      providers: [
        {
          provide: FaqService,
          useValue: mockFaqService,
        },
      ],
    }).compile();

    controller = module.get<FaqController>(FaqController);
    service = module.get<FaqService>(FaqService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getByModule', () => {
    it('should return FAQs for the DEPOSIT module', async () => {
      const module = FAQModulesEnum.DEPOSIT;
      const mockFaqs = [
        {
          _id: '66a381d8dbf5d6735fd4db79',
          question: 'How do I deposit tokens into my Hominifi wallet?',
          answer: '<p>To deposit tokens, go to the deposit section...</p>',
          videoUrl: 'https://youtu.be/iVHY0JlhjXk',
          module: FAQModulesEnum.DEPOSIT,
          addedBy: '66a37811b222ffd90f1fb850',
          createdAt: '2024-07-26T11:00:40.360Z',
          updatedAt: '2024-09-23T08:33:07.463Z',
          updatedBy: '66f11d329c1ccd0610c5a064',
        } as unknown as Document<unknown, object, FaqI> &
          FaqI &
          Required<{ _id: ObjectId }>,
      ];
      jest.spyOn(service, 'findByModule').mockResolvedValue(mockFaqs);

      const result = await controller.getByModule(module);

      expect(service.findByModule).toHaveBeenCalledWith(module);
      expect(result).toEqual(mockFaqs);
    });

    it('should return FAQs for the WITHDRAW module', async () => {
      const module = FAQModulesEnum.WITHDRAW;

      const mockFaqs = [
        {
          _id: new Types.ObjectId(),
          question: 'How to withdraw funds?',
          answer: 'Withdrawals can be made to your registered bank account.',
          module: FAQModulesEnum.WITHDRAW,
          toObject: jest.fn().mockReturnValue({
            _id: new Types.ObjectId(),
            question: 'How to withdraw funds?',
            answer: 'Withdrawals can be made to your registered bank account.',
            module: FAQModulesEnum.WITHDRAW,
          }),
          toJSON: jest.fn().mockReturnValue({
            _id: new Types.ObjectId(),
            question: 'How to withdraw funds?',
            answer: 'Withdrawals can be made to your registered bank account.',
            module: FAQModulesEnum.WITHDRAW,
          }),
        } as unknown as Document<unknown, object, FaqI> &
          FaqI &
          Required<{ _id: ObjectId }>,
      ];

      jest.spyOn(service, 'findByModule').mockResolvedValue(mockFaqs);

      const result = await controller.getByModule(module);

      expect(service.findByModule).toHaveBeenCalledWith(module);
      expect(result).toEqual(mockFaqs);
    });

    it('should handle invalid module gracefully', async () => {
      const module = 'INVALID_MODULE' as FAQModulesEnum;
      jest.spyOn(service, 'findByModule').mockResolvedValue([]);

      const result = await controller.getByModule(module);

      expect(service.findByModule).toHaveBeenCalledWith(module);
      expect(result).toEqual([]);
    });
  });
});
