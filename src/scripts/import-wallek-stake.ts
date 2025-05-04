import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { WallekStake } from '../wallek-stake/schemas/wallek-stake.schema';
import { Model, Types } from 'mongoose';
import * as fs from 'fs';
import { Wallet } from '../wallet/schemas/wallet.schema';
import { TokenService } from '../token/token.service';
import { UsersService } from '../users/users.service';
import csv = require('csv-parser');
import dayjs from 'dayjs';
import duration = require('dayjs/plugin/duration');
import { StakeSettings } from '../wallek-stake/schemas/stake-settings.schema';
import { WalletService } from '../wallet/wallet.service';

dayjs.extend(duration);
async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const wallekStakeModel = appContext.get<Model<WallekStake>>(
    WallekStake.name + 'Model',
  );
  const stakeSettingsModel = appContext.get<Model<StakeSettings>>(
    StakeSettings.name + 'Model',
  );

  const tokenService = appContext.get(TokenService);
  const userService = appContext.get(UsersService);
  const walletService = appContext.get(WalletService);

  const filePath = './src/Wallek Migration - Sheet1.csv';
  try {
    const tokens = await tokenService.getAllTokens();
    const tokenMap = new Map<string, Types.ObjectId>();
    tokens.forEach((token) => {
      tokenMap.set(token.symbol, token._id as Types.ObjectId);
    });

    const isStakeSetting = await stakeSettingsModel.find({ deletedAt: null });
    if (!isStakeSetting.length) {
      const stakeSettings: Partial<StakeSettings>[] = [];
      let toTokenId;
      for (const [symbol, fromTokenId] of tokenMap.entries()) {
        if (symbol == 'lyk') {
          toTokenId = tokenMap.get('lyk-w');
        } else {
          toTokenId = fromTokenId;
        }
        const existing = stakeSettings.some(
          (s) =>
            s.fromToken?.toString() === fromTokenId.toString() &&
            s.toToken?.toString() === toTokenId.toString(),
        );

        if (!existing) {
          stakeSettings.push({
            fromToken: fromTokenId,
            toToken: toTokenId,
          });
        }
      }
      if (stakeSettings.length > 0) {
        await stakeSettingsModel.insertMany(stakeSettings);
        console.log('New StakeSettings data imported successfully!');
      } else {
        console.log('No new StakeSettings data to import.');
      }
    }

    const rows: any[] = [];

    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => rows.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    const stakes: Partial<WallekStake>[] = [];
    const amountInD = await tokenService.getCurrentPrice();
    for (const row of rows) {
      let _token;
      const _symbol =
        row.token.toString().toLowerCase().trim() === 'layerk'
          ? 'lyk'
          : row.token.toLowerCase().trim();
      _token = tokenMap.get(_symbol);

      if (!_token) {
        console.error(`Token not found for symbol: ${row.token}`);
        continue;
      }

      const user = await userService.getOrCreateUserByBID(row.bid);
      const wallet = await walletService.findUserWalletByTokenSymbol(
        _symbol,
        user._id,
      );

      if (!amountInD || isNaN(amountInD.price)) {
        console.error(
          `Invalid price retrieved for amount ${amountInD.price} and user_bid ${row.bid}`,
        );
        continue;
      }

      const startStakedDate = row.start_staking_date
        ? new Date(row.start_staking_date)
        : new Date();
      const endStakedDate = row.end_staking_date
        ? new Date(row.end_staking_date)
        : new Date();

      const diff = dayjs.duration(
        dayjs(endStakedDate).diff(dayjs(startStakedDate)),
      );

      const differenceInMonths = Math.floor(diff.asMonths());

      // const expiryDate = new Date(row.expiry_date);
      // if (isNaN(expiryDate.getTime())) {
      //   console.error(`Invalid expiry_date for row:`, row);
      //   continue;
      // }

      const stake = new wallekStakeModel({
        user: user._id,
        token: _token,
        userBid: row.bid,
        expiryDate: endStakedDate,
        lockupPeriod: differenceInMonths,
        stakedPeriod: differenceInMonths,
        tokenAmount: row.amount,
        tokenPrice: amountInD.price,
        wallet: wallet._id as Types.ObjectId,
        amount: amountInD.price * row.amount,
        startStakedDate,
        endStakedDate,
        status: row.status,
        meta: row,
      });
      console.log(`Row has readed successfully ${row._id}`);
      stakes.push(stake);
    }

    if (stakes.length > 0) {
      await wallekStakeModel.insertMany(stakes);
      console.log('WallekStake data imported successfully!');
    } else {
      console.log('No valid data to import.');
    }
  } catch (error) {
    console.error('Error during the import process:', error);
  } finally {
    await appContext.close();
    process.exit(0);
  }
}

bootstrap().catch((err) => {
  console.error('Error bootstrapping application:', err);
  process.exit(1);
});
