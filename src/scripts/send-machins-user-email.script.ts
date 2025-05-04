import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';

import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { User } from '../users/schemas/user.schema';
import { CloudKMachine } from '../cloud-k/schemas/cloudk-machine.schema';
import { EmailService } from '../email/email.service';

const emailMessage = `
We are excited to announce that computer device deliveries have now started in eligible countries!

To proceed with your delivery, please complete your payment within 90 days of purchase. If your purchase date exceeds 90 days, you must pay before March 31 to avoid disruptions.

Access your account now to proceed with the payment!
  `;

const options = {
  batchSize: 90,
  delay: 1,
  message: emailMessage,
  testEmail: 'rahim994@outlook.com',
  dryRun: false,
};

const logger = new Logger('MachineEmailScript');

async function bootstrap() {
  logger.log('Initializing NestJS application context...');
  const appContext = await NestFactory.createApplicationContext(AppModule);

  const userModel = appContext.get<Model<User>>(User.name + 'Model');
  const machineModel = appContext.get<Model<CloudKMachine>>(
    CloudKMachine.name + 'Model',
  );
  const emailService = appContext.get(EmailService);
  const configService = appContext.get(ConfigService);

  logger.log('Services initialized successfully');

  try {
    if (options.testEmail) {
      logger.log(`Test mode: Sending email to ${options.testEmail}`);

      const user = await userModel.findOne({ email: options.testEmail });

      if (!user) {
        logger.error(`Test user not found: ${options.testEmail}`);
        await appContext.close();
        process.exit(1);
      }

      if (!options.dryRun) {
        await sendEmailToUser(emailService, user, options.message);
        logger.log(`Test email sent to ${options.testEmail}`);
      } else {
        logger.log(`[DRY RUN] Would send email to: ${options.testEmail}`);
      }

      await appContext.close();
      process.exit(0);
    }

    logger.log('Finding users with non-minimax machines...');

    const nonMinimaxMachines = await machineModel.find(
      {
        name: { $ne: 'minimax' },
      },
      '_id user',
    );

    const userIds = [
      ...new Set(nonMinimaxMachines.map((machine) => machine.user.toString())),
    ];

    const users = await userModel.find({
      _id: { $in: userIds },
      email: { $exists: true },
      $and: [{ email: { $ne: null } }, { email: { $ne: '' } }],
      isBlocked: { $ne: true },
    });

    if (users.length === 0) {
      logger.warn('No users found with non-minimax machines.');
      await appContext.close();
      process.exit(0);
    }

    logger.log(`Found ${users.length} users with non-minimax machines`);

    const batchSize = options.batchSize;
    const delayMs = options.delay * 60 * 1000;
    let successCount = 0;
    let failureCount = 0;

    logger.log(
      `Starting email campaign with batch size ${batchSize} and ${options.delay} minute(s) delay`,
    );

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(users.length / batchSize);

      logger.log(
        `Processing batch ${batchNumber} of ${totalBatches} (${batch.length} users)`,
      );

      for (const user of batch) {
        try {
          if (!options.dryRun) {
            await sendEmailToUser(emailService, user, options.message);
          } else {
            logger.log(`[DRY RUN] Would send email to: ${user.email}`);
          }
          successCount++;
          logger.log(
            `Email processed for ${user.email} (${successCount + failureCount}/${users.length})`,
          );
        } catch (error) {
          failureCount++;
          logger.error(
            `Failed to send email to ${user.email}: ${error.message}`,
          );
        }
      }

      if (i + batchSize < users.length) {
        logger.log(`Waiting ${options.delay} minute(s) before next batch...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    logger.log(
      `Email campaign completed: ${successCount} succeeded, ${failureCount} failed`,
    );
  } catch (error) {
    logger.error(`Script failed: ${error.message}`, error.stack);
    await appContext.close();
    process.exit(1);
  }

  await appContext.close();
  process.exit(0);
}

async function sendEmailToUser(emailService, user, message) {
  try {
    const customerName =
      user.firstName ||
      user.username ||
      (user.email ? user.email.split('@')[0] : 'Valued Customer');

    logger.log(
      `Preparing to send email to ${user.email} with message: ${message ? 'custom message' : 'default message'}`,
    );

    const contentToSend = message || emailMessage;

    logger.log(
      `Email parameters: ${user.email}, Message length: ${contentToSend.length}`,
    );

    await emailService.sendMailToMachinesUser(
      user.email,
      'Important Update About Your Machine',
      'Machine Update',
      'Important Information About Your Machine',
      contentToSend,
    );

    logger.log(`Email service call completed for ${user.email}`);
    return true;
  } catch (error) {
    logger.error(
      `Error in sendEmailToUser for ${user.email}: ${error.message}`,
    );
    throw error;
  }
}

bootstrap().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
