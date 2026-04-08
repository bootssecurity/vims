import { RedisEventBus } from "./event-bus";
export declare const redisEventBusProvider: import("@vims/framework").VimsProviderDefinition<{
    key: string;
    bus: RedisEventBus;
}>;
export default redisEventBusProvider;
