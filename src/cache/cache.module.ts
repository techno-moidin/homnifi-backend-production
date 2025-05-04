import { Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { TokenModule } from '../token/token.module';
import { WalletGatewayModule } from '../wallet-gateway/wallet-gateway.module';
import { CacheController } from './cache.controller';
import { PublicModule } from '../public/public.module';

@Module({
  controllers: [CacheController],
  providers: [CacheService, TokenModule, WalletGatewayModule, PublicModule],
})
export class CacheModules {}
