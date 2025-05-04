import { HttpException, HttpStatus } from '@nestjs/common';

export class BadRequestException extends HttpException {
  constructor(errors: any, statusCode: HttpStatus, message?: string) {
    super(
      {
        status: statusCode,
        success: false,
        message: message || 'Invalid Request',
        data: errors,
      },
      statusCode,
    );
  }
}
