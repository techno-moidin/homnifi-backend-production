import { BadRequestException, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-cbc'; // AES encryption
  private readonly adminKey: Buffer;
  private readonly userKey: Buffer;

  constructor() {
    const adminKeyString = process.env.ADMIN_ENCRYPTION_KEY; // 32-character string for admin
    const userKeyString = process.env.USER_ENCRYPTION_KEY; // 32-character string for user

    this.adminKey = Buffer.from(adminKeyString, 'utf8'); // Convert admin key string to buffer
    this.userKey = Buffer.from(userKeyString, 'utf8'); // Convert user key string to buffer
  }

  encrypt(text: string, isAdmin?: boolean): string {
    const iv = crypto.randomBytes(16);
    const key = isAdmin ? this.adminKey : this.userKey;
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decryptData(encryptedText: string, isAdmin?: boolean): string {
    try {
      const [ivHex, encryptedDataHex] = encryptedText.split(':');
      if (!ivHex || !encryptedDataHex) {
        throw new BadRequestException('Invalid encrypted text data');
      }
      const iv = Buffer.from(ivHex, 'hex');
      const encryptedData = Buffer.from(encryptedDataHex, 'hex');

      // Create decipher and decrypt data
      const key = isAdmin ? this.adminKey : this.userKey;
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      const decrypted = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final(),
      ]);
      return decrypted.toString();
    } catch (error) {
      throw new BadRequestException('Invalid encrypted text data');
    }
  }
}
