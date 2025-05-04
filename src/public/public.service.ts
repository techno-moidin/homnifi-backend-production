import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { CacheService } from '../cache/cache.service';
import { catchError, firstValueFrom, retry } from 'rxjs';
import * as https from 'https';

@Injectable()
export class PublicService {
  private readonly logger = new Logger(PublicService.name);

  constructor(
    private httpService: HttpService,
    private cacheService: CacheService,
  ) {}

  async getPaginatedDevices(
    page: number = 1,
    limit: number = 50,
  ): Promise<any> {
    let allDevices = await this.cacheService.getAllDevices();

    if (!allDevices || allDevices.length === 0) {
      this.logger.log('Devices not found in cache, fetching from source API');
      allDevices = await this.fetchDevicesFromSource();

      await this.cacheService.setAllDevices(allDevices);
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedDevices = allDevices.slice(startIndex, endIndex);

    return {
      devices: paginatedDevices,
      pagination: {
        total: allDevices.length,
        page,
        limit,
        pages: Math.ceil(allDevices.length / limit),
      },
    };
  }

  private async fetchDevicesFromSource(): Promise<any[]> {
    try {
      const { data } = await firstValueFrom(
        this.httpService
          .get('https://sts.orange.main.horystech.com:7557/devices', {
            // httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            timeout: 30000,
          })
          .pipe(
            retry(3),
            catchError((error) => {
              this.logger.error(
                `Failed to fetch devices after retries: ${error.message}`,
              );
              throw error;
            }),
          ),
      );

      return data;
    } catch (error) {
      this.logger.error('Failed to fetch devices from source', error.stack);
      throw error;
    }
  }
}
