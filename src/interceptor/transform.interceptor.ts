import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
  message: string;
}

export interface CustomResponse {
  statusCode?: HttpStatus;
  message?: string;
  status?: boolean;
  data: any;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map(
        ({
          data,
          message = 'OK',
          statusCode = 200,
          status = true,
        }: CustomResponse) => ({
          statusCode,
          message: data.message,
          status,
          data: data.data,
        }),
      ),
    );
  }
}
