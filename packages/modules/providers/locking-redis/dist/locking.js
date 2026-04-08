import Redis from "ioredis";
import { randomUUID } from "crypto";
const RELEASE_LUA_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
`;
export class RedisLocking {
    constructor({ logger, options }) {
        var _a;
        this.logger = logger;
        this.prefix = (_a = options.prefix) !== null && _a !== void 0 ? _a : "vims:lock:";
        this.client = new Redis(options.redisUrl || "redis://localhost:6379");
    }
    async acquire(keys, options) {
        var _a;
        const keyArr = Array.isArray(keys) ? keys : [keys];
        // In a multi-key scenario, we just lock the first for simplicity or build a multi-lock
        // Here we implement single key mapped lock to match Medusa API
        const key = this.prefix + keyArr.join(":");
        const ownerToken = randomUUID();
        const ttlMatches = (_a = options === null || options === void 0 ? void 0 : options.expireTimeout) !== null && _a !== void 0 ? _a : 15000;
        const acquired = await this.client.set(key, ownerToken, "PX", ttlMatches, "NX");
        if (!acquired) {
            throw new Error(`Could not acquire lock for key: ${keyArr.join(":")}`);
        }
        return ownerToken;
    }
    async release(keys, ownerToken) {
        const keyArr = Array.isArray(keys) ? keys : [keys];
        const key = this.prefix + keyArr.join(":");
        // Use Lua script for atomic check-and-delete
        const result = await this.client.eval(RELEASE_LUA_SCRIPT, 1, key, ownerToken);
        return result === 1;
    }
    async destroy() {
        this.client.disconnect();
    }
}
