import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { User } from '../users/schemas/user.schema';
import { Model, Types, Connection } from 'mongoose';
import { SupernodeService } from '../supernode/supernode.service';
import { SNBonusTransaction } from '../supernode/schemas/sn-bonus-transaction.schema';

const CHUNK_SIZE = 10000; // Number of users to process in a single batch

async function processUserChunk(
  users: any,
  supernodeService: SupernodeService,
) {
  return;

  return Promise.all(
    users.map(async (user) => {
      user.isBuilderGenerationActive =
        await supernodeService.isBuilderGenerationUserActiveNode(user.id);

      user.isBaseReferralActive =
        (
          await supernodeService.baseRefereralUserActiveMachine(
            new Types.ObjectId(user.id),
          )
        )?.status ?? false;

      console.log(
        `Username: ${user.username}, Builder Gen: ${user.isBuilderGenerationActive}, Base Referral: ${user.isBaseReferralActive}`,
      );

      await user.save();
    }),
  );
}

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const userModel = appContext.get<Model<User>>(User.name + 'Model');
  const supernodeService = appContext.get(SupernodeService);
  const snBonusTransaction = appContext.get<Model<SNBonusTransaction>>(
    SNBonusTransaction.name + 'Model',
  );

  

  const connection = appContext.get<Connection>('DatabaseConnection');

  const session = await connection.startSession();

  try {
    session.startTransaction();

    const users = await snBonusTransaction.find({
      receivable: false,
      createdAt: {
        $gte: new Date('2024-12-16T00:00:00.000Z'),
      },
      type: 'builder-generational',
    });
    
    const chunks = [];
    for (let i = 0; i < users.length; i += CHUNK_SIZE) {
      chunks.push(users.slice(i, i + CHUNK_SIZE));
    }

    for (const chunk of chunks) {
      await processUserChunk(chunk, supernodeService);
    }

    await session.commitTransaction();
    
  } catch (error) {
    await session.abortTransaction();
    console.error('Error updating users:', error);
  } finally {
    session.endSession();
    await appContext.close();
    process.exit(0);
  }
}

bootstrap().catch((err) => {
  console.error('Error during bootstrap:', err);
  process.exit(1);
});
