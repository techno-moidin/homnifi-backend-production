import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { TelegramService } from '../telegram/telegram.service';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class TelegramNotificationInterceptor implements NestInterceptor {
  constructor(private readonly telegramService: TelegramService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const admin = request.admin; // Retrieve the admin from the request object

    if (!admin) {
      throw new ForbiddenException('Admin not found');
    }
    const formatPayload = (obj: any, indent = 2) => {
      const formatted = JSON.stringify(obj, null, indent)
        .replace(/"([^"]+)":/g, '$1:') // Remove double quotes from keys
        .replace(/"/g, '') // Remove double quotes from values
        .replace(/\\n/g, ' '); // Replace newline characters with a space
      return formatted;
    };

    const formattedPayload = formatPayload(request.body);
    const formattedLocation = request?.headers?.location
      ? formatPayload(JSON.parse(request.headers.location))
      : '-';
    const sendNotification = async (status: string, errorMessage?: string) => {
      const currentDateTime = new Date();
      const formattedDate = currentDateTime.toLocaleString('en-GB', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      const message = `Admin Action Detected:
  • Admin: ${admin.username ?? '-'}
  • Role: ${admin.role.name ?? '-'}
  • Email: ${admin.email ?? '-'}
  • Date: ${formattedDate}

Activities:
  • Method: ${request.method}
  • Endpoint: ${request.originalUrl}
  • Payload: ${formattedPayload}
  
  • IP Address: ${request.headers.ip_address || request.ipAddress || '-'}
  • MAC Address: ${request.headers['mac_address'] || '-'}
  • Location: ${formattedLocation}

Activity Status: ${status}
${errorMessage ? `Reason: ${errorMessage}` : ''}`;

      const groupId = process.env.TELEGRAM_GROUP_ID;
      await this.telegramService.sendTelegramNotification(groupId, message);
    };

    return next.handle().pipe(
      tap(async () => {
        if (
          request.method !== 'GET' &&
          !request.originalUrl.includes('login')
        ) {
          await sendNotification('Success');
        }
      }),
      catchError(async (error) => {
        if (
          request.method !== 'GET' &&
          !request.originalUrl.includes('login')
        ) {
          await sendNotification('Failure', error.message);
        }
        throw error;
      }),
    ) as Observable<any>;
  }
}
