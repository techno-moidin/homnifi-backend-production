import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { OTP_TOKEN_TYPES, OtpTokens } from './schemas/otp-tokens.schema';
import { Model, ObjectId } from 'mongoose';
import { User } from '../users/schemas/user.schema';
import * as crypto from 'crypto';

@Injectable()
export class OtpTokensService {
  constructor(
    @InjectModel(OtpTokens.name) private otpTokensModel: Model<OtpTokens>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  generateCode(): string {
    const otp = crypto.randomInt(0, 1000000);
    return otp.toString().padStart(6, '0');
  }

  async createVerificationCode(
    user: User,
    type: OTP_TOKEN_TYPES,
  ): Promise<OtpTokens> {
    const code = this.generateCode();
    const verificationCode = new this.otpTokensModel({
      user: user._id,
      code,
      type,
      expiresAt: new Date(Date.now() + 25 * 60 * 1000),
    });
    return verificationCode.save();
  }

  async findVerificationCode(
    code: string,
    userId: ObjectId,
    type: OTP_TOKEN_TYPES,
  ): Promise<OtpTokens> {
    return this.otpTokensModel.findOne({ code, user: userId, type });
  }

  async markCodeAsUsed(id: string): Promise<OtpTokens | null> {
    return this.otpTokensModel.findByIdAndUpdate(
      id,
      { isUsed: true },
      { new: true },
    );
  }

  async checkIfCodeIsValid(
    code: string,
    userId: ObjectId,
    type: OTP_TOKEN_TYPES,
  ): Promise<OtpTokens> {
    const verificationCode = await this.findVerificationCode(
      code,
      userId,
      type,
    );
    if (!verificationCode) {
      throw new NotFoundException('Verification code not found');
    }
    if (verificationCode.isUsed) {
      throw new BadRequestException('Verification code is already used');
    }
    if (verificationCode.expiresAt < new Date()) {
      throw new BadRequestException('Verification code is expired');
    }
    return verificationCode;
  }
}
