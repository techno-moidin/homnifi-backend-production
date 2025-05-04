import { NestFactory } from '@nestjs/core';
import { Model } from 'mongoose';
import { CloudKInflationRules } from '../cloud-k/schemas/cloudk-inflation-rules.schema';
import { AppModule } from '../app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const cloudKInflationRulesModel = app.get<Model<CloudKInflationRules>>(
    'CloudKInflationRulesModel',
  );

  // const productionDecreaseUpdatePercentages = [
  //   0.0, 0.0, 5.0, 14.5, 27.3, 38.25, 47.51, 55.38, 64.3, 71.44, 77.15, 81.72,
  //   85.38, 88.31, 90.65, 92.52, 94.02, 95.22, 96.18, 96.94,
  // ];

  const increaseDLPPercentageUpdates = [
    0.0, 5.0, 15.5, 32.83, 52.75, 75.66, 110.79, 152.95, 203.54, 264.25, 337.1,
    424.52, 529.43, 655.31, 806.37, 987.65, 1205.18, 1466.21, 1779.45, 2155.34,
  ];

  // Fetch all documents from the database
  const allRules = await cloudKInflationRulesModel.find().exec();

  if (allRules.length !== increaseDLPPercentageUpdates.length) {
    console.error(
      'The number of documents does not match the number of percentages.',
    );
    process.exit(1);
  }

  for (let i = 0; i < allRules.length; i++) {
    const rule = allRules[i];
    const percentage = increaseDLPPercentageUpdates[i];

    // Update the document with the new percentage
    await cloudKInflationRulesModel.findByIdAndUpdate(
      rule._id,
      { increaseDLPPercentageUpdate: percentage },
      { new: true },
    );

    console.log(
      'Updated rule with productionDecreaseUpdatePercentage:',
      percentage,
    );
  }

  await app.close();
}

bootstrap().catch((err) => {
  console.error('Error running script:', err);
  process.exit(1);
});
