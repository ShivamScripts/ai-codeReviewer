import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World how is it looking right now!';
  }

  get(): string {
    console.log('hello world, how is ig!')
    const maths = 1 +2;
    return `${maths} Hello Prima,w is th today please tell me eerbibi, whong.`;
  }
}