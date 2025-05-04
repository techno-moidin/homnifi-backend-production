import { Test, TestingModule } from '@nestjs/testing';
import { KMallService } from './kmall.service';
import { HttpService } from '@nestjs/axios';
import { getModelToken } from '@nestjs/mongoose';
import { Network } from '../token/schemas/network.schema';
import { PlatformVoucher } from '../platform-voucher/schemas/platform-voucher.schema';
import { AxiosResponse, AxiosRequestHeaders } from 'axios';
import { of, throwError } from 'rxjs';
import { Controller, HttpException } from '@nestjs/common';

describe('KMallService', () => {
  let service: KMallService;
  let httpService: HttpService;

  const mockHttpService = {
    post: jest.fn(),
    get: jest.fn(),
  };

  const mockPlatformVoucherModel = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KMallService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: getModelToken(Network.name),
          useValue: {},
        },
        {
          provide: getModelToken(PlatformVoucher.name),
          useValue: mockPlatformVoucherModel,
        },
      ],
    }).compile();

    service = module.get<KMallService>(KMallService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createKMallWallet', () => {
    it('should return wallet address on success', async () => {
      const response: AxiosResponse = {
        data: {
          data: { data: { address: 'test-address' } },
        },
        status: 200,
        statusText: 'OK',
        headers: {} as AxiosRequestHeaders,
        config: {
          headers: {
            'Content-Type': 'application/json',
          } as AxiosRequestHeaders,
        },
      };
      jest.spyOn(httpService, 'post').mockReturnValue(of(response));

      const result = await service.createKMallWallet('network-code');

      expect(result).toEqual({ address: 'test-address' });
    });

    it('should throw HttpException on API failure', async () => {
      jest.spyOn(httpService, 'post').mockReturnValue(
        throwError(() => ({
          response: { data: 'Error occurred', status: 500 },
        })),
      );

      await expect(service.createKMallWallet('network-code')).rejects.toThrow(
        new HttpException('Error occurred', 500),
      );
    });
  });

  describe('getWalletBalance', () => {
    it('should return wallet balance on success', async () => {
      const response: AxiosResponse = {
        data: { balance: 1000 },
        status: 200,
        statusText: 'OK',
        headers: {} as AxiosRequestHeaders,
        config: {
          headers: {} as AxiosRequestHeaders,
        },
      };
      jest.spyOn(httpService, 'get').mockReturnValue(of(response));

      const result = await service.getWalletBalance('test-address');

      expect(result).toEqual({ balance: 1000 });
    });

    it('should throw HttpException on API failure', async () => {
      jest.spyOn(httpService, 'get').mockReturnValue(
        throwError(() => ({
          response: { data: 'Error occurred', status: 500 },
        })),
      );

      await expect(service.getWalletBalance('test-address')).rejects.toThrow(
        new HttpException('Error occurred', 500),
      );
    });
  });

  describe('callVoucherAPI', () => {
    it('should store vouchers in the database on success', async () => {
      const response: AxiosResponse = {
        data: {
          vouchers: [{ voucherCode: 'voucher1' }],
          productId: 'product123',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          headers: {} as AxiosRequestHeaders,
        },
      };
      jest.spyOn(httpService, 'get').mockReturnValue(of(response));

      await service.callVoucherAPI(
        'product123',
        'user123',
        1,
        'order123',
        'key123',
      );

      expect(mockPlatformVoucherModel.create).toHaveBeenCalled();
    });

    it('should log error when API fails', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(throwError(() => new Error('API Error')));

      await service.callVoucherAPI(
        'product123',
        'user123',
        1,
        'order123',
        'key123',
      );

      expect(mockPlatformVoucherModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'API Error',
        }),
      );
    });
  });

  describe('validateAddress', () => {
    it('should return true for valid address', async () => {
      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(of({} as AxiosResponse<unknown, any>));

      const result = await service.validateAddress('address', 'network');

      expect(result).toBe(true);
    });

    it('should return false for invalid address', async () => {
      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(throwError(() => new Error('Validation Error')));

      const result = await service.validateAddress('address', 'network');

      expect(result).toBe(false);
    });
  });

  describe('requestWithdrawOnExternalApp', () => {
    it('should return data on success', async () => {
      const response: AxiosResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          headers: {} as AxiosRequestHeaders,
        },
      };
      jest.spyOn(httpService, 'post').mockReturnValue(of(response));

      const result = await service.requestWithdrawOnExternalApp({
        asset: 'lyk-matic',
        amount: 100,
        address: 'test-address',
        requestId: 'test-request-id',
      });

      expect(result).toEqual({ success: true });
    });

    it('should throw HttpException on failure', async () => {
      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(throwError(() => new Error('API Error')));

      await expect(
        service.requestWithdrawOnExternalApp({
          asset: 'lyk-matic',
          amount: 100,
          address: 'test-address',
          requestId: 'test-request-id',
        }),
      ).rejects.toThrow(
        new HttpException('Error connecting to wallet service', 400),
      );
    });
  });

  describe('getHotWalletBalance', () => {
    it('should return the hot wallet balance on success', async () => {
      const response: AxiosResponse = {
        data: { balance: 5000 },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          headers: {} as AxiosRequestHeaders,
        },
      };
      jest.spyOn(httpService, 'get').mockReturnValue(of(response));

      const result = await service.getHotWalletBalance();

      expect(result).toEqual({ balance: 5000 });
    });

    it('should throw HttpException on API failure', async () => {
      jest.spyOn(httpService, 'get').mockReturnValue(
        throwError(() => ({
          response: { data: 'Error occurred', status: 500 },
        })),
      );

      await expect(service.getHotWalletBalance()).rejects.toThrow(
        new HttpException('Error occurred', 500),
      );
    });
  });
});
