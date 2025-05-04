import { Test, TestingModule } from '@nestjs/testing';
import { BurnController } from './burn.controller';
import { BurnService } from './burn.service';
import { Burn, BURN_STATUS_TYPE } from './schema/burn.schema';
import ApiResponse from '../utils/api-response.util';
import { Document, Types } from 'mongoose';
import { BurnParticipants } from './schema/burn.participant.schema';
import { BadRequestException } from '@nestjs/common';

describe('BurnController', () => {
  let controller: BurnController;
  let burnService: BurnService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BurnController],
      providers: [
        {
          provide: BurnService,
          useValue: {
            fetchActiveBurn: jest.fn(),
            getActiveBurnCalculation: jest.fn(),
            getBurnTokenLimit: jest.fn(),
            joinActiveBurn: jest.fn(),
            burnUsdkTosmLYK: jest.fn(),
            userStatusForActiveBurn: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<BurnController>(BurnController);
    burnService = module.get<BurnService>(BurnService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getActiveBurn', () => {
    it('should fetch an active burn and return it wrapped in ApiResponse', async () => {
      // Arrange
      const mockActiveBurn = {
        _id: new Types.ObjectId(),
        name: 'Active Burn Test',
        status: BURN_STATUS_TYPE.ACTIVE,
        phaseUniqueCode: 'ABC123',
        startAt: new Date(),
        expiresAt: new Date(),
        normalPercentage: 10,
        boostPercentage: 20,
        admin: new Types.ObjectId(),
        deletedAt: null,
      } as Document<unknown, object, Burn> & Burn & { _id: Types.ObjectId };

      jest
        .spyOn(burnService, 'fetchActiveBurn')
        .mockResolvedValue(mockActiveBurn);
      const result = await controller.getActiveBurn({});

      expect(burnService.fetchActiveBurn).toHaveBeenCalled();
      expect(result).toBeInstanceOf(ApiResponse);

      expect(result).toEqual({
        status: true,
        message: 'Ok',
        data: mockActiveBurn,
      });
    });
  });
  //test case for getBurnTokenLimit
  describe('getBurnTokenLimit', () => {
    it('should fetch burn token limit and return it as ApiResponse', async () => {
      const machineId = new Types.ObjectId();
      const userId = new Types.ObjectId();
      const price = '100';
      const mockResult = {
        status: true,
        totalBurnedToken: 500,
        totalBurnedAmountInDoller: 1000,
      };

      jest
        .spyOn(burnService, 'getBurnTokenLimit')
        .mockResolvedValue(mockResult);

      const mockReq = {
        user: {
          userId: userId.toHexString(),
        },
      };

      const result = await controller.getBurnTokenLimit(
        mockReq,
        machineId.toHexString(),
        price,
      );

      expect(burnService.getBurnTokenLimit).toHaveBeenCalledWith(
        machineId,
        userId,
        price,
      );
      expect(result).toBeInstanceOf(ApiResponse);
      expect(result).toEqual({
        status: true,
        message: 'Ok',
        data: mockResult,
      });
    });
    it('should throw BadRequestException if price is zero (fail scenario)', async () => {
      const machineId = new Types.ObjectId();
      const userId = new Types.ObjectId();
      const invalidPrice = '0';

      const mockReq = {
        user: {
          userId: userId.toHexString(),
        },
      };

      await expect(
        controller.getBurnTokenLimit(
          mockReq,
          machineId.toHexString(),
          invalidPrice,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  //test case for join active burn
  describe('joinActiveBurn', () => {
    it('should allow a user to join an active burn and return success message', async () => {
      const userId = new Types.ObjectId();
      const mockResult = {
        message: 'User joined campaign successfully',
        data: {
          joinParticipant: {} as Document<
            unknown,
            Record<string, never>,
            BurnParticipants
          > &
            BurnParticipants & { _id: Types.ObjectId },
          usdkPromoBalance: {
            _id: new Types.ObjectId(),
            name: 'USDK',
            symbol: 'USDK',
            balance: 100,
          },
          smlykBalance: {
            _id: new Types.ObjectId(),
            name: 'SMLYK',
            symbol: 'SMLYK',
            balance: 200,
          },
        },
      };

      jest.spyOn(burnService, 'joinActiveBurn').mockResolvedValue(mockResult);

      const mockReq = {
        user: {
          userId: userId.toHexString(),
        },
      };

      const result = await controller.joinActiveBurn(mockReq);

      expect(burnService.joinActiveBurn).toHaveBeenCalledWith(userId);
      expect(result).toBeInstanceOf(ApiResponse);

      expect(result).toEqual({
        status: true,
        message: 'User joined campaign successfully',
        data: mockResult,
      });
    });

    it('should throw BadRequestException if user is already joined (fail scenario)', async () => {
      const userId = new Types.ObjectId();

      jest.spyOn(burnService, 'joinActiveBurn').mockResolvedValue(null);

      const mockReq = {
        user: {
          userId: userId.toHexString(),
        },
      };

      await expect(controller.joinActiveBurn(mockReq)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  //test case for calculation
  describe('getActiveBurnCalculation', () => {
    it('should calculate burn amount and return it wrapped in ApiResponse (pass scenario)', async () => {
      // Arrange
      const amount = '50.5';
      const machineId = new Types.ObjectId();
      const userId = new Types.ObjectId();
      const price = '100';
      const mockResult = {
        status: true,
        phaseWalletData: {
          amount: 5050,
          dollarValue: 5050,
          percentageToBeApplied: null,
          walletBalance: null,
        },
        stakeWalletData: {
          amount: 5050,
          dollarValue: 5050,
        },
        totalToBeStakeInMachineData: {
          totalAmount: 5050,
          totalToken: 5050,
          machinePrice: 5050,
        },
        machine: {
          _id: new Types.ObjectId(),
          name: 'Machine Test',
          totalStaked: null,
          totalMlykStaked: null,
          mlykStakedAfterJoined: null,
          smlykStakedAfterJoined: null,
          maxStakeLimit: 0,
          normalPercentage: null,
          boostPercentage: null,
          boostPercentageRequiredInMlykDoller: 0,
          boostPercentageRequiredInMlyk: 0,
        },
        lykPrice: 5050,
      };

      jest
        .spyOn(burnService, 'getActiveBurnCalculation')
        .mockResolvedValue(mockResult);

      const mockReq = {
        user: {
          userId: userId.toHexString(),
        },
      };

      // Act
      const result = await controller.getActiveBurnCalculation(
        mockReq,
        amount,
        machineId.toHexString(),
        price,
      );

      // Assert
      expect(burnService.getActiveBurnCalculation).toHaveBeenCalledWith(
        parseFloat(amount),
        machineId,
        userId,
        price,
      );
      expect(result).toBeInstanceOf(ApiResponse);
      expect(result).toEqual({
        status: true,
        message: 'Ok',
        data: mockResult,
      });
    });

    it('should throw BadRequestException if amount is zero (fail scenario)', async () => {
      const invalidAmount = '0';
      const machineId = new Types.ObjectId();
      const userId = new Types.ObjectId();
      const price = '100';

      const mockReq = {
        user: {
          userId: userId.toHexString(),
        },
      };

      await expect(
        controller.getActiveBurnCalculation(
          mockReq,
          invalidAmount,
          machineId.toHexString(),
          price,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if amount is negative (fail scenario)', async () => {
      const invalidAmount = '-50';
      const machineId = new Types.ObjectId();
      const userId = new Types.ObjectId();
      const price = '100';

      const mockReq = {
        user: {
          userId: userId.toHexString(),
        },
      };
      await expect(
        controller.getActiveBurnCalculation(
          mockReq,
          invalidAmount,
          machineId.toHexString(),
          price,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // burn token usdk promo to smLYK
  describe('userStatusForActiveBurn', () => {
    let controller: BurnController;
    let burnService: BurnService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [BurnController],
        providers: [
          {
            provide: BurnService,
            useValue: {
              userStatusForActiveBurn: jest.fn(),
            },
          },
        ],
      }).compile();

      controller = module.get<BurnController>(BurnController);
      burnService = module.get<BurnService>(BurnService);
    });

    it('should fetch user status for active burn and return it as ApiResponse', async () => {
      // Arrange
      const userId = new Types.ObjectId();
      const mockResult = {
        activeBurn: {
          _id: new Types.ObjectId(),

          name: 'Active Burn Test',
          status: 'ACTIVE',
          phaseUniqueCode: 'ABC123',
          startAt: new Date(),
          expiresAt: new Date(),
          normalPercentage: 10,
          boostPercentage: 20,
          admin: new Types.ObjectId(),
          deletedAt: null,
          $assertPopulated: jest.fn(),
          $clone: jest.fn(),
          $getAllSubdocs: jest.fn(),
          $ignore: jest.fn(),
          $isDeleted: jest.fn(),
          $isEmpty: jest.fn(),
          $isValid: jest.fn(),
          $locals: {},
          $markValid: jest.fn(),
          $op: null,
          $session: jest.fn(),
          $set: jest.fn(),
          $where: jest.fn(),
          base: null,
          collection: null,
          db: null,
          deleteOne: jest.fn(),
          depopulate: jest.fn(),
          directModifiedPaths: jest.fn(),
          equals: jest.fn(),
          execPopulate: jest.fn(),
          get: jest.fn(),
          init: jest.fn(),
          invalidate: jest.fn(),
          isDirectModified: jest.fn(),
          isDirectSelected: jest.fn(),
          isInit: jest.fn(),
          isModified: jest.fn(),
          isNew: jest.fn(),
          isSelected: jest.fn(),
          markModified: jest.fn(),
          modifiedPaths: jest.fn(),
          overwrite: jest.fn(),
          populate: jest.fn(),
          populated: jest.fn(),
          remove: jest.fn(),
          replaceOne: jest.fn(),
          save: jest.fn(),
          schema: null,
          set: jest.fn(),
          toJSON: jest.fn(),
          toObject: jest.fn(),
          unmarkModified: jest.fn(),
          update: jest.fn(),
          updateOne: jest.fn(),
          validate: jest.fn(),
          validateSync: jest.fn(),
        },
      };

      jest
        .spyOn(burnService, 'userStatusForActiveBurn')
        .mockResolvedValue(mockResult);

      const mockReq = {
        user: {
          userId: userId.toHexString(),
        },
      };

      // Act
      const result = await controller.userStatusForActiveBurn(mockReq);

      // Assert
      expect(burnService.userStatusForActiveBurn).toHaveBeenCalledWith(userId);
      expect(result).toBeInstanceOf(ApiResponse);
      expect(result).toEqual({
        status: true,
        message: 'Ok',
        data: mockResult,
      });
    });
    it('should return ApiResponse with empty data if no active burn is found (false case)', async () => {
      // Arrange
      const userId = new Types.ObjectId();
      const mockResult = null; // No active burn for the user

      jest
        .spyOn(burnService, 'userStatusForActiveBurn')
        .mockResolvedValue(mockResult);

      const mockReq = {
        user: {
          userId: userId.toHexString(),
        },
      };

      // Act
      const result = await controller.userStatusForActiveBurn(mockReq);

      // Assert
      expect(burnService.userStatusForActiveBurn).toHaveBeenCalledWith(userId);
      expect(result).toBeInstanceOf(ApiResponse);
      expect(result).toEqual({
        status: true,
        message: 'Ok',
        data: mockResult,
      });
    });

    it('should throw BadRequestException if userId is invalid (false case)', async () => {
      // Arrange
      const invalidReq = {
        user: {
          userId: 'invalidUserId', // Invalid userId format
        },
      };

      // Act & Assert
      await expect(
        controller.userStatusForActiveBurn(invalidReq),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
