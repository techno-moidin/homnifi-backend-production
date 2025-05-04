import { parentPort, workerData } from 'worker_threads';
import { CloudKRewardService } from '../cloud-k/cloudk-reward.service';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CloudKService } from '../cloud-k/cloud-k.service';
import { UsersService } from '../users/users.service';
import * as fs from 'fs';
import * as path from 'path';
import { CacheService } from '../cache/cache.service';
import { CACHE_TYPE } from '../cache/Enums/cache.enum';
import { ObjectId, Types } from 'mongoose';

const run = async () => {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const userService = appContext.get(UsersService);
  const cacheService = appContext.get(CacheService);

  async function ensureObjectId(value) {
    if (typeof value === 'string') {
      return new Types.ObjectId(value);
    }
    return value;
  }

  async function getDataFromJsonFile(
    directory: string,
    filename: string,
  ): Promise<any[]> {
    const allData = [];

    const filePath = path.join(directory, filename);
    const fileData = await fs.promises.readFile(filePath, 'utf-8');
    const jsonData = JSON.parse(fileData);
    allData.push(...jsonData);

    return allData;
  }

  async function deleteJsonFiles(directory, filename: string) {
    try {
      fs.promises.unlink(path.join(directory, filename));
    } catch (error) {
      console.error('Error deleting JSON file: ' + filename, error);
    }
  }

  try {
    const directory = path.join(__dirname, '../../tmp/exported-chunks');
    const results = [];
    const userJsonData = await getDataFromJsonFile(directory, workerData);
    const bulkInsertActiveUsers = [];
    const bulkUpdates = [];

    for (const item of userJsonData) {
      let parent;
      let user;
      const userCache = await cacheService.getCacheUser({
        type: CACHE_TYPE.IMPORT_USER,
        user: item.id,
      });
      if (!userCache) {
        user = await userService.getOrCreateUserByBID(
          item.id,
          item.email,
          item.username,
        );
        await cacheService.setCacheUser({
          type: CACHE_TYPE.IMPORT_USER,
          user: item.id,
          data: user,
        });
      } else {
        user = userCache;
      }

      if (item.upline_id) {
        const uplineCache = await cacheService.getCacheUser({
          type: CACHE_TYPE.IMPORT_USER,
          user: item.upline_id,
        });

        if (!uplineCache) {
          parent = await userService.getOrCreateUserByBID(
            item.upline_id,
            item.email,
          );
          await cacheService.setCacheUser({
            type: CACHE_TYPE.IMPORT_USER,
            user: item.upline_id,
            data: parent,
          });
        } else {
          parent = uplineCache;
        }
      }

      // await userService.updateUserById(user._id, {
      //   uplineBID: item.upline_id || null,
      //   uplineId: parent ? parent._id : null,
      // });
      bulkInsertActiveUsers.push({
        user:
          typeof user._id === 'string'
            ? new Types.ObjectId(user._id)
            : user._id,
        upline: parent
          ? typeof parent._id === 'string'
            ? new Types.ObjectId(parent._id)
            : parent._id
          : null,
      });
      results.push(user._id);


      bulkUpdates.push({
        updateOne: {
          filter: { _id: user._id },
          update: {
            uplineBID: item.upline_id || null,
            uplineId: parent ? parent._id : null,
          },
        },
      });
    }
    if (bulkUpdates.length > 0) {
      await userService.bulkUpdateUsers(bulkUpdates);
    }
    await userService.createBulkActiveTreeUser(bulkInsertActiveUsers);
    await deleteJsonFiles(directory, workerData);
    parentPort.postMessage({ status: 'done', results });
    process.exit(0);
  } catch (error) {
    parentPort.postMessage({ status: 'error', message: error.message });
    process.exit(1);
  }
  
};
run();
