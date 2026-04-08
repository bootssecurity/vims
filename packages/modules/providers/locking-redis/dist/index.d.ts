import { RedisLocking } from "./locking";
export declare const redisLockingProvider: import("@vims/framework").VimsProviderDefinition<{
    key: string;
    locking: RedisLocking;
}>;
export default redisLockingProvider;
