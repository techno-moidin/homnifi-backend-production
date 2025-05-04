import { HttpException, Injectable, OnModuleInit } from '@nestjs/common';
import mongoose from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { WalletService } from '../wallet/wallet.service';
import { Types } from 'mongoose';

@Injectable()
export class WatcherService implements OnModuleInit {
  constructor(
    @InjectConnection() private readonly connection: mongoose.Connection,
    private readonly walletService: WalletService,
  ) {}

  async onModuleInit() {
    await this.watchCollection();
  }

  async watchCollection() {
    try {
      console.log('Watching for changes in wallettransactions collection...');
      const changeStream = this.connection
        .collection('wallettransactions')
        .watch();

      changeStream.on('change', async (change: any) => {
        const type = change.operationType;
        if (type !== 'insert') {
          const walletTrxId = change.documentKey._id;
          const walletTrx =
            await this.walletService.getUserByWalletTrx(walletTrxId);

          const { user, wallet }: any = walletTrx;

          console.log({ user, wallet });

          if (!user || !wallet) {
            console.log('watcher error');
            return 0;
          }

          await this.walletService.processWalletsByUser(
            user,
            new Types.ObjectId(wallet),
          );
        } else if (type === 'insert') {
          await this.walletService.processWalletsByUser(
            change.fullDocument.user,
            change.fullDocument.wallet,
          );
        }
        console.log(
          'Change detected in wallettransactions collection:',
          change,
        );
      });
    } catch (error) {
      console.error('Error watching wallettransactions collection:', error);
    }
  }

  async processWalletsByUser(user: any) {
    console.log('Processing wallets for user:', user);
    // Add your logic here
  }
}
