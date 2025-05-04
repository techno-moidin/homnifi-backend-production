import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@/src/app.module';
import { WebhookController } from '@/src/webhook/webhook.controller';
import { UsersService } from '@/src/users/users.service';
import * as assert from 'node:assert';
import { Types } from 'mongoose';
import { WebhookUpdateUserDto } from '@/src/webhook/dto/webhook-update-user.dto';
import { PlatformService } from '@/src/platform/platform.service';

describe('WebhooksController', () => {
  let webhookController: WebhookController;
  let usersService: UsersService;
  let platformsService: PlatformService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    webhookController = app.get<WebhookController>(WebhookController);
    usersService = app.get<UsersService>(UsersService);
    platformsService = app.get<PlatformService>(PlatformService);
  });

  describe('Webhooks', () => {
    it('should update a user using the webhook controller successfully', async () => {
      const bid = `${Math.round(Math.random() * Math.pow(10, 10))}`;
      const user = await usersService.getOrCreateUserByBID(bid);
      const update: WebhookUpdateUserDto = {
        bid,
        email: crypto.randomUUID().toString(),
        username: crypto.randomUUID().toString(),
        firstName: crypto.randomUUID().toString(),
        lastName: crypto.randomUUID().toString(),
        profilePicture: crypto.randomUUID().toString(),
        platform: 'jb',
      };
      const response = await webhookController.updateUserWebhook(update);
      const updated = await usersService.findUserById(
        user._id as Types.ObjectId,
      );
      assert.equal(bid, update.bid);
      assert.equal(updated.email, update.email);
      assert.equal(updated.username, update.username);
      assert.equal(updated.firstName, update.firstName);
      assert.equal(updated.lastName, update.lastName);
      assert.equal(updated.profilePicture, update.profilePicture);
      assert.equal(response['message'], 'User updated successfully');
      assert.equal(response['status'], true);
    });
  });
});
