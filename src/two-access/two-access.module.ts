import { Module } from '@nestjs/common';
import { TwoAccessService } from './two-access.service';
import { TwoAccessController } from './two-access.controller';
import { UserRewards, UserRewardsSchema } from '../users/schemas/user-rewards';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ActiveUserTree,
  ActiveUserTreeSchema,
} from '../users/schemas/active-user-tree.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserRewards.name, schema: UserRewardsSchema },
      { name: ActiveUserTree.name, schema: ActiveUserTreeSchema },
      { name: User.name, schema: UserSchema },
    ]),
    UsersModule,
  ],
  controllers: [TwoAccessController],
  providers: [TwoAccessService],
  exports: [TwoAccessService],
})
export class TwoAccessModule {}
