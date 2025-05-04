import { CloudKRewardService } from '../cloud-k/cloudk-reward.service';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { CloudKMachine } from '../cloud-k/schemas/cloudk-machine.schema';
import { UserSngp } from '../supernode/schemas/user-sngp.schema';
import * as fs from 'fs'; // Import the fs module

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const userSngpModel = appContext.get<Model<UserSngp>>(
    UserSngp.name + 'Model',
  );
  const userSngp = await userSngpModel.aggregate([
    {
      $lookup: {
        from: 'cloudkmachines',
        localField: 'machine',
        foreignField: '_id',
        as: 'machine',
      },
    },
    {
      $unwind: {
        path: '$machine',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: {
          user: '$user',
          sngp: '$sngp',
        },
        machines: {
          $push: {
            machineId: '$machine._id',
            externalMachineId: '$machine.externalMachineId',
            sngp: '$sngp',
            points: '$points',
          },
        },
      },
    },
  ]);
  if (!userSngp.length) {
    ;
    process.exit(0);
  }

  ;
  const result = [];
  for (let index = 0; index < userSngp.length; index++) {
    const element = userSngp[index];
    const machines = [];
    let points = 0;

    await element.machines.forEach((machine) => {
      machines.push({
        machine: machine.machineId,
        externalMachineId: machine.externalMachineId,
        points: machine.points,
      });
      points = points + machine.points;
    });

    await result.push({
      user: element._id.user,
      sngp: element._id.sngp,
      points,
      machines,
    });
  }

  ;

  // Write the result to a JSON file
  fs.writeFileSync(
    'user_sngp_data.json',
    JSON.stringify(result, null, 2),
    'utf8',
  );
  ;

  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
