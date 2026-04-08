import { RedisEventBus } from "./event-bus.js";
export declare const redisEventBusProvider: import("@vims/framework").VimsProviderDefinition<{
    key: string;
    bus: RedisEventBus;
}>;
export default redisEventBusProvider;
