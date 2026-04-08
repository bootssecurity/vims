import { RedisLocking } from "./locking.js";
export declare const redisLockingProvider: import("@vims/framework").VimsProviderDefinition<{
    key: string;
    locking: RedisLocking;
}>;
export default redisLockingProvider;
