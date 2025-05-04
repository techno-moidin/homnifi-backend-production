import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { Types } from 'mongoose';
import { GetCacheDto, SetCacheDto } from './dtos/cache.dtos';
import { RedisClientType } from 'redis';
import { CACHE_TYPE } from './Enums/cache.enum';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async deleteUserCache(cacheQuery: GetCacheDto) {
    const keyValue = `${cacheQuery.type}_${cacheQuery.user.toString()}`;
    return await this.cacheManager.del(keyValue);
  }

  async getCacheUser(cacheQuery: GetCacheDto): Promise<any> {
    const keyValue = `${cacheQuery.type}_${cacheQuery.user.toString()}`;
    return await this.cacheManager.get(keyValue);
  }

  async setCacheUser(cacheQuery: SetCacheDto, ttl: number = 3600) {
    const keyValue = `${cacheQuery.type}_${cacheQuery.user.toString()}`;

    if (ttl === Infinity) {
      // If ttl is Infinity, set the cache without an expiration time
      return await this.cacheManager.set(keyValue, cacheQuery.data);
    } else {
      return await this.cacheManager.set(keyValue, cacheQuery.data, {
        ttl,
      } as any);
    }
  }

  async setRedis(
    cacheQuery: {
      type: string;
      key: string;
      data: any;
    },
    ttl?: number,
  ) {
    const keyValue = `${cacheQuery.type}_${cacheQuery.key}`;
    return await this.cacheManager.set(keyValue, cacheQuery.data, {
      ttl: ttl ?? 0, // No limit if ttl is undefined
    } as any);
  }

  async resetCache(): Promise<void> {
    return await this.cacheManager.reset();
  }

  async resetCacheWithoutAdminSession(): Promise<void> {
    try {
      const redisClient: RedisClientType = (
        this.cacheManager.store as any
      ).getClient();

      // 1. Fetch all AD_* keys and their values
      const adKeys = await redisClient.keys(`${CACHE_TYPE.ADMIN_USER}_*`);
      const adData = new Map();

      // Store all AD_* keys and their values
      for (const key of adKeys) {
        const value = await redisClient.get(key);
        adData.set(key, value);
      }

      // 2. Reset everything
      await this.cacheManager.reset();

      // 3. Restore AD_* keys and values
      for (const [key, data] of adData.entries()) {
        // Set the value with 2 hour TTL (7200 seconds)
        await redisClient.set(key, data.value, { EX: 7200 });
      }

      return;
    } catch (error) {
      console.log('Reset Chache issue:', error);
    }
  }
  async deleteCacheUserWithPattern(pattern: string) {
    const redisClient: RedisClientType = (
      this.cacheManager.store as any
    ).getClient();

    const keyValue = `${pattern}*`;
    const keys = await redisClient.keys(keyValue);
    if (!keys.length) return { message: `No keys are matched.` };
    if (keys.length > 0) {
      await Promise.all(keys.map((key) => redisClient.del(key)));
    }

    return { message: `Deleted ${keys.length} keys matching pattern.` };
  }

  async getCacheMulipleKeyUser(cacheQuery: GetCacheDto): Promise<any> {
    const keyValue = `${cacheQuery.type}_${cacheQuery.user.toString()}_${cacheQuery.other_Type.toString()}`;
    return await this.cacheManager.get(keyValue);
  }

  async setCacheMulipleUser(cacheQuery: SetCacheDto, ttl: number = 3600) {
    const keyValue = `${cacheQuery.type}_${cacheQuery.user.toString()}_${cacheQuery.other_Type.toString()}`;
    return await this.cacheManager.set(keyValue, cacheQuery.data, {
      ttl,
    } as any);
  }

  async getAllDevices(): Promise<any[]> {
    return (await this.cacheManager.get('devices:all')) || [];
  }

  async setAllDevices(devices: any[]): Promise<void> {
    await this.cacheManager.set('devices:all', devices, {
      ttl: 3600,
    } as any);
  }
}
