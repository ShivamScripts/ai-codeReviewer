import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  get(): string {
    console.log('hello world, how is it going!')
    return 'Hello Prima!';
  }
}
