import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '@/src/users/schemas/user.schema'; // Assuming you have a User schema
import { EncryptionService } from '@/src/encryption/encryption.service';

@Injectable()
export class BlockGuard implements CanActivate {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const encryptionService = new EncryptionService();
    const identifier = encryptionService.decryptData(request.body?.username);

    if (!identifier) {
      throw new ForbiddenException('User identification not provided.');
    }
    const user = await this.userModel
      .findOne({
        $or: [{ username: identifier }, { email: identifier }],
      })
      .exec();

    if (!user) {
      return true;
    }

    if (user.isBlocked) {
      throw new ForbiddenException('Your account access has been blocked');
    }

    return true;
  }
}
