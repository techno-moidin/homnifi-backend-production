import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerMiddleware } from './middleware/logger.middleware';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { OtpTokensModule } from './otp-tokens/otp-tokens.module';
import { AdminModule } from './admin/admin.module';
import { AdminLogModule } from './admin/log/admin.log.module';
import { CloudKModule } from './cloud-k/cloud-k.module';
import { WalletModule } from './wallet/wallet.module';
import { TokenModule } from './token/token.module';
import { MyBlockchainIdModule } from './my-blockchain-id/my-blockchain-id.module';
import { KMallModule } from './k-mall/kmall.module';
import { FaqModule } from './faq/faq.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { TasksModule } from './tasks/tasks.module';
import { DeviceModule } from './device/device.module';
import { BrowserInfoMiddleware } from './middleware/bowser-info.middleware';
import { PlatformModule } from './platform/platform.module';
import { SupportModule } from './support/support.module';

import { MaintenanceMiddleware } from './middleware/maintenance.middleware';

import { NotificationModule } from './notification/notification.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SettingsModule } from './setting/setting.module';
import { MyFriendsModule } from './myfriends/myfriends.module';
import { GatewayModule } from './gateway/gateway.module';
import { CacheModules } from './cache/cache.module';
import { NewsModule } from './news/news.module';
import { RedisOptions } from './utils/config';
import { AdminHostMiddleware } from './middleware/admin-host.middleware';
import { AdminLog, AdminLogModel } from './admin/log/schema/admin.log.schema';
import { WebhookModule } from './webhook/webhook.module';
import { ImpersonateModule } from './impersonate/impersonate.module';
import { WalletGatewayModule } from './wallet-gateway/wallet-gateway.module';
import { BurnModule } from './burn/burn.module';
import { PlatformVoucherModule } from './platform-voucher/platform-voucher.module';
import { EncryptionService } from './encryption/encryption.service';
import { CountriesModule } from './countries/countries.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { postgresConfig } from './utils/postgresql/postgres.config';
import { TwoAccessModule } from './two-access/two-access.module';
import { WallekStakeModule } from './wallek-stake/wallek-stake.module';
import { RabbitmqModule } from './rabbitmq/rabbitmq.module';
import { MachineTrackingModule } from './machine-tracking/machine-tracking.module';
import { WatcherService } from './watcher/watcher.services';
import { ConsumerModule } from './consumer/consumer.module';
import { PublicModule } from './public/public.module';
import { BullmqModule } from './bullmq/bullmq.module';
import { BullBoardService } from './bullboard';
import { BullModule } from '@nestjs/bullmq';
import { QueueNames } from './bullmq/enums/queue-names.enum';

import { TBalanceModule } from './t-balance/t-balance.module';
import { AuthMiddleware } from './middleware/auth.middleware';
import { UsdkStakeModule } from './usdk-stake/usdk-stake.module';

// async function watchCollection(connection: mongoose.Connection) {
//   try {
//     console.log('Watching for changes in users collection...');
//     const changeStream = connection.collection('wallettransactions').watch();

//     changeStream.on('change', async (change: any) => {
//       const type = change.operationType;
//       if (type !== 'insert') {
//         const walletId = change.documentKey._id;
//         const user = await getUserByWallet(walletId);
//         await processWalletsByUser(user);
//       } else if (type === 'insert') {
//         // const walletId = change.documentKey._id;
//         // const user = await getUserByWallet(walletId);
//         await processWalletsByUser(change.fullDocument.user);
//       }

//       console.log('Change detected in users collection:', change);
//     });
//   } catch (error) {
//     console.error('Error watching users collection:', error);
//   }
// }
@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: '.env', isGlobal: true }),
    CacheModule.registerAsync(RedisOptions),
    //  PostgreSQL Configuration
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: postgresConfig,
    }),

    //SECONDARY_PROGRESS PostgreSQL Database
    TypeOrmModule.forRootAsync({
      name: 'SECONDARY_PROGRESS',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        postgresConfig(configService, 'SECONDARY_PROGRESS'),
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        // connectionName: 'default',
        uri: config.get<string>('MONGODB_URI'),

        connectionFactory: async (connection) => {
          // await watchCollection(connection);
          connection.on('connected', () => {});
          connection.on('error', (err) => {
            console.error('Database connection error:', err);
          });
          return connection;
        },
        connectTimeoutMS: 5000,
        writeConcern: {
          w: 1,
          wtimeout: 5000,
        },
      }),
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      connectionName: 'webhook',
      useFactory: async (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI_WEBHOOK'),
        connectionFactory: (connection) => {
          connection.on('connected', () => {});
          connection.on('error', (err) => {
            console.error('Database connection error:', err);
          });
          return connection;
        },
        connectTimeoutMS: 5000,
        writeConcern: {
          w: 1,
          wtimeout: 5000,
        },
      }),
    }),
    MongooseModule.forFeature([{ name: AdminLog.name, schema: AdminLogModel }]),

    ScheduleModule.forRoot(),
    // TypeOrmModule.forFeature([UserEntity]), // :white_check_mark: Ensure UserEntity is registered

    TasksModule,
    UsersModule,
    MyBlockchainIdModule,
    AuthModule,
    EmailModule,
    OtpTokensModule,
    AdminModule,
    AdminLogModule,
    CloudKModule,
    WalletModule,
    TokenModule,
    KMallModule,
    FaqModule,
    MaintenanceModule,
    DeviceModule,
    PlatformModule,
    SupportModule,
    NotificationModule,
    SettingsModule,
    MyFriendsModule,
    GatewayModule,
    CacheModules,
    NewsModule,
    AdminLogModule,
    WebhookModule,
    ImpersonateModule,
    WalletGatewayModule,
    BurnModule,
    CountriesModule,
    PlatformVoucherModule,
    TwoAccessModule,
    WallekStakeModule,
    RabbitmqModule,
    MachineTrackingModule,
    ConsumerModule,
    PublicModule,
    BullmqModule,
    ...Object.values(QueueNames).map((queueName) =>
      BullModule.registerQueue({
        name: queueName,
      }),
    ),
    TBalanceModule,
    UsdkStakeModule,
  ],
  controllers: [AppController],
  providers: [AppService, EncryptionService, WatcherService, BullBoardService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('*')
      .apply(AuthMiddleware)
      .forRoutes('*')
      .apply(AdminHostMiddleware)
      .forRoutes('admin/*')
      .apply(BrowserInfoMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL })
      .apply(MaintenanceMiddleware) // Apply the maintenance middleware
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
