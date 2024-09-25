import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { APIResponse } from 'src/utils/apiResponse.utils';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private logger = new Logger();

  catch(exception: HttpException, host: ArgumentsHost) {
    let err = exception['response'];
    err = err.response ? err.response : JSON.stringify(err);
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const status = exception.getStatus();
    this.logger.error(
      `Message : ${err}`,
      `${context.getRequest().method} ${context.getRequest().url}`,
    );
    const error =
      typeof exception.getResponse() === 'string'
        ? exception.getResponse()
        : exception.getResponse() &&
            typeof exception.getResponse()['message'] === 'object'
          ? exception.getResponse()['message'].join(', ')
          : exception.getResponse()['message'];

    response.status(status).json(APIResponse.create(0, status, error));
  }
}
