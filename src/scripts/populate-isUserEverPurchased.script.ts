import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { User } from '../users/schemas/user.schema';
import { Model, Types, Connection } from 'mongoose';
import { SupernodeService } from '../supernode/supernode.service';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const userModel = appContext.get<Model<User>>(User.name + 'Model');

  const users = await userModel
    .aggregate([
      {
        $match: {
          deletedAt: null,
        },
      },
      {
        $lookup: {
          from: 'cloudkmachines',
          localField: '_id',
          foreignField: 'user',
          as: 'machines',
        },
      },
      {
        $unwind: {
          path: '$machines',
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $group: {
          _id: '$_id',
        },
      },
    ])
    .exec();
  // make the array as chunks
  const chunks = [];
  let chunk = [];

  async function UpdateUser(id) {
    return await userModel.findOneAndUpdate(
      { _id: id },
      {
        isUserEverPurchasedMachine: true,
      },
    );
  }

  
  for (let i = 0; i < users.length; i++) {
    chunk.push(UpdateUser(users[i]._id));
    if ((i + 1) % 200 === 0) {
      chunks.push(chunk);
      chunk = [];
    }
  }
  if (chunk.length > 0) {
    chunks.push(chunk);
  }

  
  for (let i = 0; i < chunks.length; i++) {
    console.log('Processing chunk' + (i + 1), chunks[i].length);
    await Promise.all(chunks[i]);
  }
  process.exit(1);
}

bootstrap().catch((err) => {
  console.error('Error during bootstrap:', err);
  process.exit(1);
});
