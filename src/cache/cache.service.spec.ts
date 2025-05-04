import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { GetCacheDto, SetCacheDto } from './dtos/cache.dtos';
import { CACHE_TYPE } from './Enums/cache.enum';

describe('CacheService', () => {
  let service: CacheService;
  let cacheManager: Cache;

  beforeEach(async () => {
    const mockCacheManager = {
      del: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      reset: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    cacheManager = module.get<Cache>(CACHE_MANAGER);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('deleteUserCache', () => {
    it('should delete the cache for the given user and type', async () => {
      const cacheQuery: GetCacheDto = {
        user: '614c1b5f1c4ae01f5c3e6d9c',
        type: CACHE_TYPE.ACTIVE_USER,
      };
      jest.spyOn(cacheManager, 'del').mockResolvedValue(undefined);

      await service.deleteUserCache(cacheQuery);

      expect(cacheManager.del).toHaveBeenCalledWith(
        'AN_614c1b5f1c4ae01f5c3e6d9c',
      );
    });
  });

  describe('getCacheUser', () => {
    it('should return cached data for the given user and type', async () => {
      const cacheQuery: GetCacheDto = {
        user: '614c1b5f1c4ae01f5c3e6d9c',
        type: CACHE_TYPE.ACTIVE_USER,
      };
      const cachedData = { key: 'value' };
      jest.spyOn(cacheManager, 'get').mockResolvedValue(cachedData);

      const result = await service.getCacheUser(cacheQuery);

      expect(cacheManager.get).toHaveBeenCalledWith(
        'AN_614c1b5f1c4ae01f5c3e6d9c',
      );
      expect(result).toEqual(cachedData);
    });
  });

  describe('setCacheUser', () => {
    it('should set cache for the given user, type, and data', async () => {
      const cacheQuery: SetCacheDto = {
        user: '614c1b5f1c4ae01f5c3e6d9c',
        type: CACHE_TYPE.ACTIVE_USER,
        data: { key: 'value' },
      };
      const ttl = 180;

      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

      await service.setCacheUser(cacheQuery, ttl);

      expect(cacheManager.set).toHaveBeenCalledWith(
        'AN_614c1b5f1c4ae01f5c3e6d9c',
        { key: 'value' },
        { ttl },
      );
    });
  });

  describe('resetCache', () => {
    it('should reset the cache', async () => {
      jest.spyOn(cacheManager, 'reset').mockResolvedValue(undefined);

      await service.resetCache();

      expect(cacheManager.reset).toHaveBeenCalled();
    });
  });
});
