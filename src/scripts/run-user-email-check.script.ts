import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import mongoose, { Model, Types } from 'mongoose';
import { UserTwoAccess } from '../users/schemas/user-twoAccess.schema';
import { User } from '../users/schemas/user.schema';
// postgres 2access data
import { TwoAccessService } from '../two-access/two-access.service';

async function run() {
  try {
    console.log(`[${new Date().toISOString()}] Starting processing`);

    const appContext = await NestFactory.createApplicationContext(AppModule);
    const UserModel: Model<User> = appContext.get('UserModel');
    const UserTwoAccessModel: Model<UserTwoAccess> =
      appContext.get('UserTwoAccessModel');
    // ✅ Get TwoAccessService from NestJS context
    const twoAccessService = appContext.get(TwoAccessService);
    // Find users with empty email field
    // ✅ Enable Mongoose Debugging
    mongoose.set('debug', true);

    const users = await UserModel.aggregate([
      {
        $group: {
          _id: '$email',
          // Group by the email field
          count: {
            $sum: 1,
          },
          // Count the number of occurrences,
          ids: {
            $push: '$_id',
          },
        },
      },
      {
        $match: {
          count: {
            $gt: 1,
          }, // Only include groups where the count is greater than 1
        },
      },
      // {
      //   $count:
      //     /**
      //      * Provide the field name for the count.
      //      */
      //     "string"
      // }
    ]);

    console.log('total duplicate email user count', users.length);

    for (let index = 0; index < users.length; index++) {
      const element = users[index];
      for (let index = 0; index < element.ids.length; index++) {
        const id = element.ids[index];
        const user_old = await UserModel.findOne({ _id: id });
        console.log(
          'user_old.blockchainId',
          user_old.blockchainId,
          // user_old.email,
        );

        // TODO: Get user from 2access postgres database
        var emailUpdate = await twoAccessService.findByIdTwoAccessUsers(
          user_old.blockchainId,
        );
        console.log('emailUpdate >>>>>>>> ', emailUpdate);

        if (!emailUpdate) {
          console.log('emailUpdate:-----', user_old.blockchainId);
        }
        if (emailUpdate && emailUpdate.length > 0 && emailUpdate[0].email) {
          await UserModel.updateOne(
            { _id: id },
            { email: emailUpdate[0].email },
          );
          console.log(
            `${index} Updated email for user: `,
            user_old.blockchainId,
            // user_old.blockchainId,// TODO: Get id from postgres database
          );
        }
      }
    }

    const users_empty_email = await UserModel.find({ email: '' });
    for (let index = 0; index < users_empty_email.length; index++) {
      // for (let index = 0; index < 10; index++) {
      const element = users_empty_email[index];
      // console.log('empty email element.blockchainId', element.blockchainId);
      // TODO: Get user from 2access postgres database
      // var emailUpdateEmpty = await UserTwoAccessModel.findOne({
      //   bid: element.blockchainId,
      // });
      var emailUpdateEmpty = await twoAccessService.findByIdTwoAccessUsers(
        element.blockchainId,
      );

      console.log('emailUpdateEmpty', emailUpdateEmpty, element.blockchainId);

      if (
        // users_empty_email &&
        // users_empty_email.length > 0 &&
        emailUpdateEmpty &&
        emailUpdateEmpty.length > 0 &&
        emailUpdateEmpty[0].email
      ) {
        await UserModel.updateOne(
          { _id: element._id },
          { email: emailUpdateEmpty[0].email },
        );

        // await UserModel.updateOne(
        //   { _id: id },
        //   { email: emailUpdate[0].email },
        // );
        // console.log(`${index} Updated email for user: `, element.blockchainId);

        console.log(
          `${element._id} element._id: `,
          element.blockchainId,
          emailUpdateEmpty[0].email,
          element.email,
        );
      }
    }

    console.log(
      // `[${new Date().toISOString()}] Total users with duplicate emails: ${users.length}`,
      `[${new Date().toISOString()}] Total users with empty emails: ${users_empty_email.length}`,
    );

    console.log(`[${new Date().toISOString()}] Processing completed`);

    await appContext.close();
    process.exit(0);
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Critical error:`,
      error.message,
    );
    process.exit(1);
  }
}

process.on('uncaughtException', (error) => {
  console.error(
    `[${new Date().toISOString()}] Uncaught exception:`,
    error.message,
  );
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(`[${new Date().toISOString()}] Unhandled rejection:`, reason);
  process.exit(1);
});

run();
