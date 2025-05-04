import { Body, Controller, Post, Query } from '@nestjs/common';
import { EncryptionService } from './encryption.service';

@Controller('encryption')
export class EncryptionController {
  constructor(private readonly encryptionService: EncryptionService) {}

  @Post('encrypt-data')
  encryptData(
    @Body() body: Record<string, any>,
    @Query('isAdmin') isAdmin?: boolean,
  ) {
    if (!body || Object.keys(body).length === 0) {
      return { message: 'At least one field is required for encryption' };
    }
    const encryptedData: Record<string, string> = {};
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string') {
        encryptedData[key] = this.encryptionService.encrypt(value, isAdmin);
      } else {
        encryptedData[key] = 'Invalid field type, only strings are supported';
      }
    }
    return { message: 'Encryption successful', encryptedData };
  }

  @Post('decrypt-data')
  decryptData(
    @Body() body: Record<string, string>,
    @Query('isAdmin') isAdmin?: boolean,
  ) {
    if (!body || Object.keys(body).length === 0) {
      return {
        message: 'At least one encrypted field is required for decryption',
      };
    }
    const decryptedData: Record<string, string> = {};
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string') {
        try {
          decryptedData[key] = this.encryptionService.decryptData(
            value,
            isAdmin,
          );
        } catch (error) {
          decryptedData[key] = 'Decryption failed: ' + error.message;
        }
      } else {
        decryptedData[key] = 'Invalid field type, only strings are supported';
      }
    }
    return { message: 'Decryption successful', decryptedData };
  }
}
