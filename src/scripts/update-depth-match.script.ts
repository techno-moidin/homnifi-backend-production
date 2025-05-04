import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { User } from '../users/schemas/user.schema';

async function bootstrap() {
  const startTime = Date.now();
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const userModel = appContext.get<Model<User>>(`${User.name}Model`);

  try {
    console.log('Starting depth migration...');

    // Find all users without a depth
    const usersWithoutDepth = await userModel.find({
      depth: { $eq: 4 },
    });
    console.log(`Found ${usersWithoutDepth.length} users without depth`);

    for (const user of usersWithoutDepth) {
      // Find the upline user
      const uplineUser = await userModel.findById(user.uplineId);

      // Check if upline user exists and has a depth greater than 0
      if (uplineUser && uplineUser.depth > 0) {
        const newDepth = uplineUser.depth + 1;

        // Update user's depth
        await userModel.findByIdAndUpdate(user._id, { depth: newDepth });

        console.log(`Updated user ${user._id} with depth ${newDepth}`);
      } else {
        console.log(`Skipping user ${user._id}: No valid upline depth`);
      }
    }

    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;
    console.log(`Migration completed in ${totalTime} seconds`);
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await appContext.close();
  }
}

bootstrap().catch((err) => {
  console.error('Bootstrap error:', err);
  process.exit(1);
});
