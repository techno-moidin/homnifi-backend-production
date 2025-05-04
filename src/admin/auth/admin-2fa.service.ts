import { InternalServerErrorException } from '@nestjs/common';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';

export class TwoFAService {
  async generate2Fa(title: string): Promise<Record<any, any>> {
    const secret = authenticator.generateSecret();
    const otpAuthUrl = authenticator.keyuri(
      title,
      process.env.APP_NAME,
      secret,
    );
    const data = await qrcode.toDataURL(otpAuthUrl);
    return {
      secret,
      qr: data,
    };
  }

  async verify2Fa(token: string, secret: string) {
    try {
      return authenticator.check(token, secret);
    } catch (err) {
      
      throw new InternalServerErrorException('Verification failed');
    }
  }
}
