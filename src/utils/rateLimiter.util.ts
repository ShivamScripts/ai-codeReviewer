import { RedisService } from '@liaoliaots/nestjs-redis';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);

  constructor(private readonly redisService: RedisService) {}

  async isRateLimited(senderId: string, repoId: string): Promise<boolean> {
    const client = this.redisService.getClient();
    const key = `rate_limit:${senderId}:${repoId}`;
    const currentCount = await client.get(key);

    if (currentCount && parseInt(currentCount) >= 5) {
      return true;
    }

    await client
      .multi()
      .incr(key)
      .expire(key, 60) // TTL of 60 seconds
      .exec();

    return false;
  }
}
