import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World how is it looking right now!';
  }

  get(): string {
    console.log('hello world, how is ig!')
    return 'Hello Prima, how is th today please tell me eerbibi, whong.';
  }
}