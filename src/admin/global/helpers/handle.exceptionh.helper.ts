import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';

export function catchException(e: Error) {
  if (e instanceof HttpException) {
    throw new HttpException(e.message, e.getStatus());
  }
  if (e.name === 'CastError') {
    throw new BadRequestException('Invalid ID');
  } else if (e.name === 'ValidationError') {
    throw new BadRequestException(e.message);
  } else {
    throw new HttpException(
      `Internal error ${e} `,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
