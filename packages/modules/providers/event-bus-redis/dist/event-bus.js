import { Queue, Worker } from "bullmq";
import Redis from "ioredis";
export class RedisEventBus {
    constructor({ logger, options }) {
        var _a;
        this.subscribers = new Map();
        this.logger = logger;
        this.queueName = (_a = options.queueName) !== null && _a !== void 0 ? _a : "vims-events";
        this.connection = new Redis(options.redisUrl || "redis://localhost:6379", {
            maxRetriesPerRequest: null, // BullMQ requires this
        });
        // Create the queue for emitting events
        this.queue = new Queue(this.queueName, {
            connection: this.connection,
            defaultJobOptions: { removeOnComplete: true, removeOnFail: false }
        });
        // Create the worker for processing events independently
        this.worker = new Worker(this.queueName, async (job) => {
            await this.processJob(job);
        }, { connection: this.connection });
        this.worker.on("failed", (job, err) => {
            this.logger.error(`[RedisEventBus] Job failed: ${job === null || job === void 0 ? void 0 : job.id} (${job === null || job === void 0 ? void 0 : job.name})`, err);
        });
    }
    async emit(eventOrEvents, options) {
        const events = Array.isArray(eventOrEvents) ? eventOrEvents : [eventOrEvents];
        if (events.length === 0)
            return;
        const jobsMap = [];
        for (const ev of events) {
            const subs = this.subscribers.get(ev.name);
            if (!subs || subs.size === 0)
                continue;
            // Unroll to Fan-out independent jobs per subscriber
            let subscriberIndex = 0;
            for (const _ of subs) {
                const jobOpts = Object.assign({}, options);
                if (options === null || options === void 0 ? void 0 : options.delay)
                    jobOpts.delay = options.delay;
                if (options === null || options === void 0 ? void 0 : options.attempts)
                    jobOpts.attempts = options.attempts;
                jobsMap.push({
                    name: `${ev.name}:${subscriberIndex}`,
                    data: {
                        eventName: ev.name,
                        payload: ev.payload,
                        subscriberIndex,
                    },
                    opts: jobOpts,
                });
                subscriberIndex++;
            }
        }
        if (jobsMap.length > 0) {
            await this.queue.addBulk(jobsMap);
        }
    }
    async subscribe(eventName, subscriber, context) {
        const name = String(eventName);
        let subs = this.subscribers.get(name);
        if (!subs) {
            subs = new Set();
            this.subscribers.set(name, subs);
        }
        subs.add(subscriber);
        return this;
    }
    async unsubscribe(eventName, subscriber) {
        const subs = this.subscribers.get(String(eventName));
        if (subs) {
            subs.delete(subscriber);
        }
        return this;
    }
    async processJob(job) {
        const { eventName, payload, subscriberIndex } = job.data;
        const subs = this.subscribers.get(eventName);
        if (!subs || subs.size === 0)
            return;
        const subscriberArr = Array.from(subs);
        const subscriber = subscriberArr[subscriberIndex];
        if (!subscriber)
            return;
        try {
            await subscriber(payload, eventName);
        }
        catch (err) {
            this.logger.error(`[RedisEventBus] Subscriber ${subscriberIndex} failed for ${eventName}`, err);
            throw err; // BullMQ fails just this specific job, allowing independent retry without side-effects
        }
    }
    async destroy() {
        await this.worker.close();
        await this.queue.close();
        this.connection.disconnect();
    }
}
