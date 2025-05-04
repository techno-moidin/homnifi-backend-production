import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { ActiveUserTree } from '../users/schemas/active-user-tree.schema';
import { User } from '../users/schemas/user.schema';
import path from 'path';
import fs from 'fs';

function groupByUpline(data) {
  return data.reduce((acc, item) => {
    if (!acc[item.upline]) {
      acc[item.upline] = [];
    }
    acc[item.upline].push(item);
    return acc;
  }, {});
}

function buildHierarchy(node, groupedByUpline) {
  const children = groupedByUpline[node.user._id] || [];

  return {
    blockchainId: node.user.blockchainId,
    children: children.map((child) => buildHierarchy(child, groupedByUpline)),
  };
}

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const ActiveUserTreeModel = appContext.get<Model<ActiveUserTree>>(
    ActiveUserTree.name + 'Model',
  );

  const list = [];

  const userModel = appContext.get<Model<User>>(User.name + 'Model');

  const user = await userModel.findOne({ blockchainId: '0109161011' });

  try {
    // Fetch all users
    const userTree: any = await ActiveUserTreeModel.find()
      .populate('user')
      .lean();

    

    const groupedByUpline = groupByUpline(userTree);

    const calculateDownlineTotals = (node, type = 'normal') => {
      let isBuilderGenerationActive = 0;
      let isBaseReferralActive = 0;
      let firstLineBuilderGenerational = 0;
      let firstLineBaseReferral = 0;
      let totalNode = 0;

      const children = groupedByUpline[node.user._id] || [];

      // Process the current node

      if (type !== 'init') {
        if (node.user.isBuilderGenerationActive) {
          isBuilderGenerationActive += 1; // Count current node
        }
        if (node.user.isBaseReferralActive) {
          isBaseReferralActive += 1;
        }
      } else {
        for (let index = 0; index < children.length; index++) {
          const firstLineChildren = children[index];
          if (firstLineChildren.user.isBuilderGenerationActive) {
            firstLineBuilderGenerational += 1;
          }
          if (firstLineChildren.user.isBaseReferralActive) {
            firstLineBaseReferral += 1;
          }
        }
      }

      // Traverse all the children and accumulate their totals
      for (const child of children) {
        totalNode += 1;
        list.push(child);
        const childTotals = calculateDownlineTotals(child);
        isBaseReferralActive += childTotals.isBaseReferralActive;
        isBuilderGenerationActive += childTotals.isBuilderGenerationActive;
        totalNode += childTotals.totalNode;
      }

      return {
        isBuilderGenerationActive,
        isBaseReferralActive,
        firstLineBuilderGenerational,
        firstLineBaseReferral,
        firstLineNode: children.length,
        totalNode,
      };
    };

    // Process each root user in the tree

    const userTr: any = await ActiveUserTreeModel.findOne({ user: user._id })
      .populate('user')
      .lean();

    const totals = calculateDownlineTotals(userTr, 'init');
    const hierarchy = buildHierarchy(userTr, groupedByUpline);
    const json = JSON.stringify(hierarchy, null, 2);

    const outputPath = path.resolve(process.cwd(), 'user-blockchain-data.json');
    fs.writeFileSync(outputPath, json);
    

    
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    await appContext.close();
  }
}

bootstrap().catch((err) => {
  console.error('Bootstrap error:', err);
  process.exit(1);
});
