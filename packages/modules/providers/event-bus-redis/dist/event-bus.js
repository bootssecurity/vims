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
        // Create the worker for processing events
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
        const jobsMap = events.map((ev) => {
            const jobOpts = Object.assign({}, options);
            if (options === null || options === void 0 ? void 0 : options.delay)
                jobOpts.delay = options.delay;
            if (options === null || options === void 0 ? void 0 : options.attempts)
                jobOpts.attempts = options.attempts;
            return {
                name: ev.name,
                data: ev,
                opts: jobOpts,
            };
        });
        await this.queue.addBulk(jobsMap);
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
        const eventName = job.name;
        const subs = this.subscribers.get(eventName);
        if (!subs || subs.size === 0)
            return;
        const eventData = job.data;
        // Execute concurrently
        await Promise.all(Array.from(subs).map((sub) => sub(eventData.payload, eventData.name).catch((err) => {
            this.logger.error(`[RedisEventBus] Subscriber error for ${eventName}`, err);
            throw err; // BullMQ catches this to mark job failed if not all subs succeed
        })));
    }
    async destroy() {
        await this.worker.close();
        await this.queue.close();
        this.connection.disconnect();
    }
}
