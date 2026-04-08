import Redis from "ioredis";
import { randomUUID } from "crypto";

interface Logger {
  info(msg: string, meta?: any): void;
  error(msg: string, meta?: any): void;
  warn(msg: string, meta?: any): void;
  debug?(msg: string, meta?: any): void;
}

type RedisLockingOptions = {
  redisUrl: string;
  prefix?: string;
};

const RELEASE_LUA_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
`;

export class RedisLocking {
  private readonly logger: Logger;
  private readonly client: Redis;
  private readonly prefix: string;

  constructor({
    logger,
    options
  }: {
    logger: Logger;
    options: RedisLockingOptions
  }) {
    this.logger = logger;
    this.prefix = options.prefix ?? "vims:lock:";
    this.client = new Redis(options.redisUrl || "redis://localhost:6379");
  }

  async acquire(keys: string | string[], options?: { expireTimeout?: number }): Promise<string> {
    const keyArr = Array.isArray(keys) ? keys : [keys];
    const key = this.prefix + keyArr.join(":");

    const ownerToken = randomUUID();
    const ttlMatches = options?.expireTimeout ?? 15000;

    const acquired = await this.client.set(key, ownerToken, "PX", ttlMatches, "NX");

    if (!acquired) {
      throw new Error(`Could not acquire lock for key: ${keyArr.join(":")}`);
    }

    return ownerToken;
  }

  async release(keys: string | string[], ownerToken: string): Promise<boolean> {
    const keyArr = Array.isArray(keys) ? keys : [keys];
    const key = this.prefix + keyArr.join(":");

    // Use Lua script for atomic check-and-delete
    const result = await this.client.eval(RELEASE_LUA_SCRIPT, 1, key, ownerToken);
    return result === 1;
  }

  async destroy(): Promise<void> {
    this.client.disconnect();
  }
}
