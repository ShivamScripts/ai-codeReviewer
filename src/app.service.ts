import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World how is it looking right now!';
  }

  get(): string {
    console.log('hello world, how is it going!')
    return 'Hello Prima, how is the weather! how are you, what are you doing. what can i do for you today are you recieving we hook event';
  }
}