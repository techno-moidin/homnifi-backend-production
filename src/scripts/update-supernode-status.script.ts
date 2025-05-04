import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { User } from '../users/schemas/user.schema';
import { Model, Types } from 'mongoose';
import { SupernodeService } from '../supernode/supernode.service';
import {
  CLOUDK_MACHINE_STATUS,
  CloudKMachine,
} from '../cloud-k/schemas/cloudk-machine.schema';

const CHUNK_SIZE = 5000;

async function processMachineChunk(
  machines: CloudKMachine[],
  userModel: Model<User>,
  supernodeService: SupernodeService,
) {
  return Promise.all(
    machines.map(async (machine) => {
      const userId = machine.user;

      // Fetch user details
      const user = await userModel.findById(userId);
      if (!user) {
        console.warn(`User with ID ${userId} not found.`);
        return;
      }

      // Update user details
      user.isBuilderGenerationActive =
        await supernodeService.isBuilderGenerationUserActiveNode(userId);

      user.isBaseReferralActive =
        (
          await supernodeService.baseRefereralUserActiveMachine(
            new Types.ObjectId(userId),
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
  const machineModel = appContext.get<Model<CloudKMachine>>(
    CloudKMachine.name + 'Model',
  );
  const userModel = appContext.get<Model<User>>(User.name + 'Model');
  const supernodeService = appContext.get(SupernodeService);

  try {
    const machines = await machineModel.find({
      status: CLOUDK_MACHINE_STATUS.ACTIVE,
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
    });

    const chunks = [];
    for (let i = 0; i < machines.length; i += CHUNK_SIZE) {
      chunks.push(machines.slice(i, i + CHUNK_SIZE));
    }

    for (const chunk of chunks) {
      await processMachineChunk(chunk, userModel, supernodeService);
    }
  } catch (error) {
    console.error('Error updating users:', error);
  } finally {
    await appContext.close();
    process.exit(0);
  }
}

bootstrap().catch((err) => {
  console.error('Error during bootstrap:', err);
  process.exit(1);
});
