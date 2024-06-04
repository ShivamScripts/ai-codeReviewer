import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  get(): string {
    return 'Hello Primathon!';
  }
}
