import { program } from 'commander';
import fs from 'fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/src/app.module';
import { MyBlockchainIdService } from '@/src/my-blockchain-id/my-blockchain-id.service';
import { WalletService } from '@/src/wallet/wallet.service';
import { Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import pLimit from 'p-limit';

program
  .name('USDK Wallet Migration')
  .description(
    'Reads a JSON file, compares the Bid with user ID, and retrieves their balance from the wallet table',
  )
  .option('-f, --file <item>', 'JSON file to use for migration', 'data.json')
  .option(
    '-c, --chunkSize <number>',
    'Number of records to process in parallel',
    '100',
  );

program.parse();
const opts = program.opts();
const { file, chunkSize } = opts;

if (typeof file !== 'string' || !fs.existsSync(file)) {
  throw new Error(`File ${file} does not exist`);
}

if (!fs.statSync(file).isFile()) {
  throw new Error(`File ${file} is not a file`);
}

const CHUNK_SIZE = parseInt(chunkSize, 10); // Records per chunk, e.g., 100
const CHUNK_CONCURRENCY = 3; // Number of chunks to process in parallel

const logFilePath = 'log.md';

function logError(Bid: string, errorMessage: string) {
  const logEntry = `Bid: ${Bid}, Error: ${errorMessage}\n`;
  fs.appendFileSync(logFilePath, logEntry);
}

async function processChunk(
  chunk: any[],
  myBlockchainIdService: MyBlockchainIdService,
  walletService: WalletService,
  concurrencyLimit: number = 10, // Limit within each chunk
) {
  const limit = pLimit(concurrencyLimit);
  const promises = chunk.map((record) =>
    limit(async () => {
      let { SourceId: Bid } = record;
      const { EmailAddress } = record;
      const { Balance: Amount } = record;

      // Ensure Bid is 10 digits by padding with zeros if needed
      if (Bid.toString().length < 10) {
        Bid = Bid.toString().padStart(10, '0');
      }

      const amountNumber = Number(Amount);
      if (isNaN(amountNumber)) {
        const errorMessage = `Invalid amount for Bid ${Bid}: ${Amount}`;
        console.error(errorMessage);
        logError(Bid, errorMessage);
        return;
      }

      try {
        const user = await myBlockchainIdService.syncUserByBid(Bid);

        if (!user) {
          const errorMessage = `User with Bid ${Bid} not found.`;
          logError(Bid, errorMessage);
          return;
        }

        if (user.blockchainId !== Bid || user.email !== EmailAddress) {
          const errorMessage = `Mismatch for Bid ${Bid}: got Bid ${Bid} and Email ${EmailAddress}, '{expected Bid ${user.blockchainId} and Email ${user.email}}'`;
          console.error(errorMessage);
          logError(Bid, errorMessage);
          return;
        }

        const webhookRequestId = new Types.ObjectId();
        const hash = uuidv4();
        global.noNotification = true; // Avoid sending notifications

        try {
          await walletService.webhookTokenDeposit(
            {
              platform: 'horysmall',
              amount: amountNumber,
              bid: Bid,
              address: Bid,
              hash: hash,
              token: 'usdk',
              note: 'This is temporary migration script',
              isBid: 'true',
            },
            'horysmall',
            webhookRequestId,
          );
        } catch (err) {
          console.error(`Error in webhookTokenDeposit for Bid ${Bid}:`, err);
        }
      } catch (err) {
        console.error(`Error processing Bid ${Bid}:`, err);
      }
    }),
  );

  await Promise.all(promises);
}

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const myBlockchainIdService = appContext.get(MyBlockchainIdService);
  const walletService = appContext.get(WalletService);

  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const chunks = [];

    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      chunks.push(data.slice(i, i + CHUNK_SIZE));
    }

    const limit = pLimit(CHUNK_CONCURRENCY);
    const chunkPromises = chunks.map((chunk, index) =>
      limit(async () => {
        await processChunk(chunk, myBlockchainIdService, walletService);
      }),
    );

    await Promise.all(chunkPromises);
  } catch (error) {
    console.error('An error occurred during processing:', error);
  } finally {
    await appContext.close();
  }
}

bootstrap();
