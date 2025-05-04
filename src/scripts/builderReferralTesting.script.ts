const data = [
  {
    id: '8349460488',
    upline_id: null,
    username: 'user1',
    email: 'user1@gmail.com',
    productId: 'xk-validator',
    isProduct: true,
  },

  {
    id: '1374142504',
    upline_id: '8349460488',
    username: 'user2',
    email: 'user2@gmail.com',
    productId: 'xkvalidator-hmnf-f',
    isProduct: true,
  },
  {
    id: '9245771798',
    upline_id: '8349460488',
    username: 'user3',
    email: 'user3@gmail.com',
    isProduct: true,
    productId: 'xk-10000',
  },
  {
    id: '1021672209',
    upline_id: '8349460488',
    username: 'user4',
    email: 'user4@gmail.com',
    isProduct: true,
    productId: 'xk-5000',
  },
  {
    id: '2658899644',
    upline_id: '1021672209',
    username: 'user5',
    email: 'user5@gmail.com',
    isProduct: true,
    productId: 'xk-10000',
  },

  {
    id: '6684907081',
    upline_id: '1374142504',
    username: 'user7',
    email: 'user7@gmail.com',
    isProduct: true,
    productId: 'xk-1000',
  },
  {
    id: '7173816291',
    upline_id: '9245771798',
    username: 'user8',
    email: 'user6@gmail.com',
    isProduct: true,
    productId: 'xk-10000',
  },
  {
    id: '4704493835',
    upline_id: '7173816291',
    username: 'user9',
    email: 'user6@gmail.com',
    isProduct: true,
    productId: 'xk-10000',
  },
  {
    id: '0800456176',
    upline_id: '6684907081',
    username: 'user10',
    email: 'user10@gmail.com',
    isProduct: true,
    productId: 'xk-10000',
  },
];

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { BuilderGenerationalRewardService } from '../supernode/builder-generation.service';
import { UsersService } from '../users/users.service';
import { CloudKService } from '../cloud-k/cloud-k.service';
import { CacheService } from '../cache/cache.service';
import { Types } from 'mongoose';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const service = appContext.get(BuilderGenerationalRewardService);
  const userService = appContext.get(UsersService);
  const cloudkService = appContext.get(CloudKService);
  const cacheService = appContext.get(CacheService);
  const products: any = await cloudkService.getAllProducts();

  const results = [];
  for (let index = 0; index < data.length; index++) {
    const element = data[index];
    const randomIndex = Math.floor(Math.random() * products.length);
    const selectedProduct = products[randomIndex];

    let parent;
    const user = await userService.getOrCreateUserByBID(
      element.id,
      element.email,
    );
    if (element?.upline_id) {
      parent = await userService.getOrCreateUserByBID(
        element.upline_id,
        element.email,
      );
    }

    await userService.createActiveTreeUser({
      user: user._id,
      upline: parent?._id,
    });
    if (element.isProduct) {
      const userMachine = await cloudkService.deprecated_createNewMachine(
        element.productId,
        element.id,
      );
      userMachine.collatoral = userMachine.productPrice;
      await userMachine.save();
    }
    results.push(user._id);
  }

  // await cacheService.resetCache();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
