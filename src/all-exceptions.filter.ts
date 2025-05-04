import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { Request, Response } from 'express';
import { MongooseError } from 'mongoose';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const statusCode = this.getStatusCode(exception);

    // try {
    //   JSON.parse(exception?.response?.error);
    // } catch (error) {
    //   return response
    //     .status(statusCode)
    //     .send(exception?.response?.error || exception);
    // }

    const errorResponse = {
      status: false,
      ...this.getErrorMessage(exception, statusCode),
      path: request.url,
      timestamp: new Date().toISOString(),
      data: null,
    };

    response.status(statusCode).json(errorResponse);
  }

  private getStatusCode(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    } else if (exception instanceof ValidationError) {
      return HttpStatus.BAD_REQUEST; // Custom status code for validation errors
    } else {
      return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }

  private getErrorMessage(exception: unknown | any, statusCode: number): any {
    if (exception instanceof ValidationError) {
      // ;
      return {
        message: Object.values(exception.value)
          .map((err: any) => err.message)
          .join(', '),
        errors: [],
      };
    } else if (exception instanceof HttpException) {
      // ;

      const responseContent: any = exception.getResponse();

      let errors = [];

      if (typeof responseContent?.message === 'string') {
        errors = [responseContent?.message];
      } else {
        errors = responseContent?.message
          ? responseContent?.message.map((item: any) => {
              return {
                name: statusCode === 400 ? 'ValidatorError' : 'HttpException',
                message: item,
              };
            })
          : [exception.message];
      }

      return {
        message: errors[0].message || errors[0],
        errors: errors,
      };
    } else if (exception instanceof Error) {
      ;
      ;

      const errors = [];
      if (exception['errors']) {
        for (const key of Object.keys(exception['errors'])) {
          errors.push(exception['errors'][key]);
        }
      }
      return {
        message: exception.message,
        errors: errors,
      };
    } else {
      ;

      // Handle other exceptions
      return {
        message: 'Internal server error',
        errors: [],
      };
    }
  }
}
