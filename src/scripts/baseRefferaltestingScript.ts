// Data for Single Node Upline Tree
const data = [
  {
    id: '8349460488',
    upline_id: null,
    username: 'userA',
    email: 'userA@gmail.com',
    productId: 'vm-100',
    isProduct: true,
  },

  {
    id: '1374142504',
    upline_id: '8349460488',
    username: 'userB',
    email: 'userB@gmail.com',
    productId: 'xkvalidator-hmnf-f',
    isProduct: true,
  },
  {
    id: '9245771798',
    upline_id: '8349460488',
    username: 'userC',
    email: 'userC@gmail.com',
    isProduct: true,
    productId: 'xkvalidator-hmnf-f',
  },
  {
    id: '1021672209',
    upline_id: '8349460488',
    username: 'userD',
    email: 'userD@gmail.com',
    isProduct: true,
    productId: 'xkvalidator-hmnf-f',
  },
  {
    id: '4704493835',
    upline_id: '8349460488',
    username: 'userI',
    email: 'userI@gmail.com',
    isProduct: true,
    productId: 'xkvalidator-hmnf-f',
  },
  {
    id: '0800456176',
    upline_id: '8349460488',
    username: 'userJ',
    email: 'userJ@gmail.com',
    isProduct: true,
    productId: 'xkvalidator-hmnf-f',
  },
  {
    id: '2658899644',
    upline_id: '1374142504',
    username: 'userE',
    email: 'userE@gmail.com',
    isProduct: true,
    productId: 'xk-10000',
  },

  {
    id: '6684907081',
    upline_id: '1374142504',
    username: 'userH',
    email: 'userH@gmail.com',
    isProduct: true,
    productId: 'xk-1000',
  },
  {
    id: '7173816291',
    upline_id: '2658899644',
    username: 'userF',
    email: 'userF@gmail.com',
    isProduct: true,
    productId: 'xk-10000',
  },
  {
    id: '1680530419',
    upline_id: '2658899644',
    username: 'userG',
    email: 'userG@gmail.com',
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
import { Model, Types } from 'mongoose';
import { PLATFORMS } from '../global/enums/wallet.enum';
import { BaseReferralRewardService } from '../supernode/base-referral-generate.service';
import { CloudKMachine } from '../cloud-k/schemas/cloudk-machine.schema';

async function bootstrap() {
  // Before Run TODO:
  // Run supernode testing script
  // Create cloud k products in DB
  // Create Bulider generation settings in DB

  const appContext = await NestFactory.createApplicationContext(AppModule);
  const service = appContext.get(BaseReferralRewardService);
  const userService = appContext.get(UsersService);
  const cloudkService = appContext.get(CloudKService);
  const cacheService = appContext.get(CacheService);
  const machineModel = appContext.get<Model<CloudKMachine>>(
    CloudKMachine.name + 'Model',
  );
  const products: any = await cloudkService.getAllProducts();

  const results = [];
  for (let index = 0; index < data.length; index++) {
    const element = data[index];
    // const randomIndex = Math.floor(Math.random() * products.length);
    // const selectedProduct = products[randomIndex];

    let parent;
    const user = await userService.getOrCreateUserByBIDForScript(
      element.id,
      element.email,
    );

    // if (element?.upline_id) {
    //   parent = await userService.getOrCreateUserByBIDForScript(
    //     element.upline_id,
    //     element.email,
    //   );
    // }
    // await userService.createActiveTreeUser({
    //   user: user._id,
    //   upline: parent?._id,
    // });
    // if (element.isProduct) {
    //   const userMachine: any =
    //     await cloudkService.createNewMachineV2_Deprecated(
    //       element.productId,
    //       element.id,
    //       1,
    //       null,
    //       null,
    //       PLATFORMS.HOMNIFI,
    //     );
    //   userMachine.collatoral = 1000;
    //   await userMachine[0].save();
    // }
    const getMachine = await machineModel.findOne({
      user: user._id,
    });
    if (getMachine.collatoral < 100) {
      getMachine.collatoral = 200;
      await getMachine.save();
    }

    results.push({ userId: user._id, machineId: getMachine._id });
  }

  for (let i = 0; i < results.length; i++) {
    const value = {
      userId: results[i].userId,
      amount: 100,
      cloudkTrx: null,
      currentPrice: 1,
      machineId: results[i].machineId,
      job: null,
    };

    // await service.generateCommission(value);
  }
  // await cacheService.resetCache();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
