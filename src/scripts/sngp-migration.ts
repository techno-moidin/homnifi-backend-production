import { program } from 'commander';
import fs from 'fs';
import path from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/src/app.module';
import { MyBlockchainIdService } from '@/src/my-blockchain-id/my-blockchain-id.service';
import { SNGlogbalPollService } from '@/src/supernode/sn-global-poll.service';
import { CloudKService } from '@/src/cloud-k/cloud-k.service';
import { getsngpPoints } from './sngp-extract-data';
import { STATUS_TYPE } from '../supernode/enums/sngp-type.enum';

program
  .name('SNGP Migration')
  .description(
    'Reads a JSON file, compares the Bid with user ID, and retrieves their balance from the wallet table',
  )
  .option('-f, --file <item>', 'JSON file to use for migration', 'XeraXGI.json')
  .option(
    '-c, --chunkSize <number>',
    'Number of records to process in parallel',
    '100',
  );

program.parse();
const opts = program.opts();
const { file } = opts;

// Define the path to the JSON file
const filePath = path.join(__dirname, '../../uploads/sngp', file);

;

if (typeof file !== 'string' || !fs.existsSync(filePath)) {
  throw new Error(`File ${filePath} does not exist`);
}

if (!fs.statSync(filePath).isFile()) {
  throw new Error(`File ${filePath} is not a file`);
}

async function processRecord(
  record: any,
  myBlockchainIdService: MyBlockchainIdService,
  sNGlogbalPollService: SNGlogbalPollService,
) {
  let { 'User BID': Bid } = record;
  const { Points } = record;

  // Ensure Bid is 10 digits by padding with zeros if needed
  if (Bid.toString().length < 10) {
    Bid = Bid.toString().padStart(10, '0');
  }

  try {
    const user = await myBlockchainIdService.syncUserByBid(Bid);

    if (!user) {
      const errorMessage = `User with Bid ${Bid} not found.`;
      ;
      return;
    }
    await sNGlogbalPollService.sngpPointDistribution(Points, user?.id);
    // Add your logic here to handle the user data
    ;
  } catch (err) {
    const errorMessage = `Error processing Bid ${Bid}: ${err.message}`;
    console.error(errorMessage);
  }
}

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const myBlockchainIdService = appContext.get(MyBlockchainIdService);
  const sNGlogbalPollService = appContext.get(SNGlogbalPollService);

  try {
    const data = getsngpPoints();

    for (const record of data) {
      await processRecord(record, myBlockchainIdService, sNGlogbalPollService);
    }
    ;
    process.exit(0);
  } catch (error) {
    console.error('An error occurred during processing:', error);
  } finally {
    await appContext.close();
  }
}

bootstrap();
