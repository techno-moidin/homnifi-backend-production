import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { ActiveUserTree } from '../users/schemas/active-user-tree.schema';
import { User } from '../users/schemas/user.schema';
import { CloudKMachine } from '../cloud-k/schemas/cloudk-machine.schema';

function groupByUpline(data, groupedByUser) {
  return data.reduce((acc, item) => {
    if (!acc[item.uplineId]) {
      acc[item.uplineId] = [];
    }
    item.isMachineAvailable = !!groupedByUser[item._id];
    acc[item.uplineId].push(item);
    return acc;
  }, {});
}

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);

  const userModel = appContext.get<Model<User>>(User.name + 'Model');
  const cloudKMachineModel = appContext.get<Model<CloudKMachine>>(
    CloudKMachine.name + 'Model',
  );

  try {
    const FetchAllMachinesByUser = await cloudKMachineModel
      .find({ deletedAt: null })
      .select('_id user')
      .lean()
      .exec();

    // Group by `user`
    const groupedByUser = FetchAllMachinesByUser.reduce((acc, machine: any) => {
      const userId = machine.user; // Assuming `user` is the field representing the user ID
      if (!acc[userId]) {
        acc[userId] = [];
      }
      acc[userId].push(machine);
      return acc;
    }, {});

    console.log('groupedByUser', groupedByUser);

    // Fetch all users
    const PAGE_SIZE = 25000;
    let skip = 0;
    let allUser = [];

    // Fetch all data in batches
    while (true) {
      const batch = await userModel
        .find()
        .select(
          '_id isBuilderGenerationActive isBaseReferralActive uplineBID uplineId blockchainId isMembership',
        )
        .skip(skip)
        .limit(PAGE_SIZE)
        .lean()
        .exec();

      if (batch.length === 0) break;

      allUser = allUser.concat(batch);
      console.log(`Fetched ${allUser.length} records`);
      skip += PAGE_SIZE;
    }
    console.log('active user tree done', allUser);

    const groupedByUpline = groupByUpline(allUser, groupedByUser);
    console.log('groupedByUpline done', groupedByUpline);

    const calculateDownlineTotals = (node, type = 'normal') => {
      let isBuilderGenerationActive = 0;
      let isBaseReferralActive = 0;
      let firstLineBuilderGenerational = 0;
      let firstLineBaseReferral = 0;
      let totalNode = 0;
      let totalUserwithMembership = 0;
      let totalUserwithoutMembership = 0;
      //
      let totalUserwithMachine = 0;
      let totalUserwithoutMachine = 0;
      const children = groupedByUpline[node._id] || [];

      // Process the current node

      if (type !== 'init') {
        if (node?.isBuilderGenerationActive || false) {
          isBuilderGenerationActive += 1;
        }
        if (node?.isBaseReferralActive || false) {
          isBaseReferralActive += 1;
        }
      } else {
        for (let index = 0; index < children.length; index++) {
          const firstLineChildren = children[index];
          if (firstLineChildren?.isBuilderGenerationActive || false) {
            firstLineBuilderGenerational += 1;
          }
          if (firstLineChildren?.isBaseReferralActive || false) {
            firstLineBaseReferral += 1;
          }
        }
      }

      // Traverse all the children and accumulate their totals
      for (const child of children) {
        totalNode += 1;
        //
        if (child?.isMembership || false) {
          totalUserwithMembership += 1;
        } else {
          totalUserwithoutMembership += 1;
        }
        if (child?.isMachineAvailable || false) {
          totalUserwithMachine += 1;
        } else {
          totalUserwithoutMachine += 1;
        }

        const childTotals = calculateDownlineTotals(child);
        isBaseReferralActive += childTotals.isBaseReferralActive;
        isBuilderGenerationActive += childTotals.isBuilderGenerationActive;
        totalNode += childTotals.totalNode;
        totalUserwithMembership += childTotals.totalUserwithMembership;
        totalUserwithoutMembership += childTotals.totalUserwithoutMembership;
        totalUserwithMachine += childTotals.totalUserwithMachine;
        totalUserwithoutMachine += childTotals.totalUserwithoutMachine;
      }

      return {
        isBuilderGenerationActive,
        isBaseReferralActive,
        firstLineBuilderGenerational,
        firstLineBaseReferral,
        firstLineNode: children.length,
        totalNode,
        //
        totalUserwithMembership,
        totalUserwithoutMembership,
        totalUserwithMachine,
        totalUserwithoutMachine,
      };
    };

    // Batch processing
    const BATCH_SIZE = 5000;
    const updates = [];
    let skipUpdate = 0;

    for (const user of allUser) {
      const totals = calculateDownlineTotals(user, 'init');
      updates.push({
        updateOne: {
          filter: { _id: user._id },
          update: {
            $set: {
              totalBuilderGenarational: totals.isBuilderGenerationActive,
              totalBaseReferral: totals.isBaseReferralActive,
              firstLineBuilderGenerational: totals.firstLineBuilderGenerational,
              firstLineBaseReferral: totals.firstLineBaseReferral,
              firstLineNode: totals.firstLineNode,
              totalNode: totals.totalNode,
              //
              totalUserwithMembership: totals.totalUserwithMembership,
              totalUserwithoutMembership: totals.totalUserwithoutMembership,

              totalUserwithMachine: totals.totalUserwithMachine,
              totalUserwithoutMachine: totals.totalUserwithoutMachine,
            },
          },
        },
      });

      // Process in batches
      if (updates.length === BATCH_SIZE) {
        await userModel.bulkWrite(updates);
        skipUpdate = skipUpdate + BATCH_SIZE;
        console.log(`Processed Data : ${skipUpdate}`);
        updates.length = 0;
      }
    }

    // Process remaining updates
    if (updates.length > 0) {
      await userModel.bulkWrite(updates);
      skipUpdate = skipUpdate + updates.length;

      console.log(`Processed Data : ${skipUpdate}`);
    }
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    await appContext.close();
    process.exit(0);
  }
}
bootstrap().catch((err) => {
  console.error('Unhandled error during script execution:', err);
  process.exit(1);
});
