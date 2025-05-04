import { program } from 'commander';
import { parse } from 'csv-parse';
import fs from 'fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/src/app.module';
import { UsersService } from '@/src/users/users.service';

program
  .name("User's Patcher")
  .description("Patches the user's collection from a csv file")
  .option(
    '-f, --file <item>',
    'CSV file to use for patching the users collection',
    'data.csv',
  )
  .option('-d, --delimiter <item>', 'CSV file delimiter', ',');

program.parse();

const opts = program.opts();
const { file, delimiter } = opts;

if (typeof file !== 'string' || !fs.existsSync(file)) {
  throw new Error(`File ${file} does not exist`);
}

if (!fs.statSync(file).isFile()) {
  throw new Error(`File ${file} is not a file`);
}

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const usersService = appContext.get(UsersService);

  const parser = parse({
    columns: true,
    delimiter,
  });

  fs.createReadStream(file).pipe(parser);

  const allPromises = [];
  parser.on('error', function (err) {
    parser.end();
    throw err;
  });

  parser.on('finish', function () {
    ;
    parser.end();
  });

  parser.on('end', async function () {
    await Promise.all(allPromises);
    process.exit(0);
  });

  let index = 0;
  parser.on('readable', function () {
    let record;
    while ((record = parser.read()) !== null) {
      index++;
      Object.keys(record).forEach((key) => {
        if (!record[key]) delete record[key];
      });
      const bid = record.userBid;
      if (!bid) {
        console.error(`Record ${record} is missing userBid at index ${index}`);
        continue;
      }
      delete record.userBid;
      allPromises.push(
        usersService
          .updateUserByBid(bid, record)
          .then((response) => {
            if (!response) throw new Error(`User with bid: ${bid} not found`);
            ;
          })
          .catch((e) => console.error(e)),
      );
    }
  });
}

bootstrap();
