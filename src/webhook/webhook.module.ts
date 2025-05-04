import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';

import { User, UserSchema } from '../users/schemas/user.schema';
import { Token, TokenSchema } from '../token/schemas/token.schema';
import {
  WebhookModel,
  WebhookModelSchema,
} from './schemas/webhookModel.schema';
import { WalletModule } from '../wallet/wallet.module';
import { Platform, PlatformSchema } from '../platform/schemas/platform.schema';
import { PlatformModule } from '../platform/platform.module';
import { TokenModule } from '@/src/token/token.module';
import {
  TrustpilotWebhookModel,
  TrustpilotWebhookModelSchema,
} from './schemas/trustpilotModel.schema';
import { HttpModule, HttpService } from '@nestjs/axios';
import {
  MembershipWebhookModel,
  MembershipWebhookModelSchema,
} from './schemas/membershipWebhookModel.schema';
import {
  WebhookUploadRewardFile,
  WebhookUploadRewardFileSchema,
} from './schemas/webhookUploadRewardFile';
import {
  MachineTrack,
  MachineTrackSchema,
} from '../machine-tracking/schema/machine-tracking.schema';
import {
  CloudKMachine,
  CloudKMachineSchema,
} from '../cloud-k/schemas/cloudk-machine.schema';
import { MachineTrackingModule } from '../machine-tracking/machine-tracking.module';

@Module({
  imports: [

    MongooseModule.forFeature([
      // { name: WebhookModel.name, schema: WebhookModelSchema },

      { name: Platform.name, schema: PlatformSchema },
      { name: User.name, schema: UserSchema },

      {
        name: TrustpilotWebhookModel.name,
        schema: TrustpilotWebhookModelSchema,
      },
      {
        name: WebhookUploadRewardFile.name,
        schema: WebhookUploadRewardFileSchema,
      },
      {
        name: MachineTrack.name,
        schema: MachineTrackSchema,
      },
      {
        name: CloudKMachine.name,
        schema: CloudKMachineSchema,
      },
    ]),
    MongooseModule.forFeature(
      [
        {
          name: WebhookModel.name,
          schema: WebhookModelSchema,
        },
        {
          name: MembershipWebhookModel.name,
          schema: MembershipWebhookModelSchema,
        },
      ],
      'webhook',
    ),
    HttpModule,
    forwardRef(() => WalletModule),
    PlatformModule,
    TokenModule,
    MachineTrackingModule,

  ],

  controllers: [WebhookController],

  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}
