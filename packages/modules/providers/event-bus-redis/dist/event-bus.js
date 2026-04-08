var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { Queue, Worker } from "bullmq";
import Redis from "ioredis";
export class RedisEventBus {
    constructor({ logger, options }) {
        var _a, _b;
        this.subscribers = new Map();
        this.workerJobHandler = async (job) => {
            const { eventName, payload, metadata } = job.data;
            const eventSubscribers = this.subscribers.get(eventName) || [];
            const wildcardSubscribers = this.subscribers.get("*") || [];
            const allSubscribers = eventSubscribers.concat(wildcardSubscribers);
            // Pull already completed subscribers from the job data
            const completedSubscribers = job.data.completedSubscriberIds || [];
            // Filter out already completed subscribers
            const subscribersInCurrentAttempt = allSubscribers.filter((sub) => sub.id && !completedSubscribers.includes(sub.id));
            const currentAttempt = job.attemptsMade;
            const isRetry = currentAttempt > 1;
            const configuredAttempts = job.opts.attempts || 1;
            const isFinalAttempt = currentAttempt === configuredAttempts;
            if (isRetry && isFinalAttempt) {
                this.logger.info(`Final retry attempt for ${eventName}`);
            }
            const completedSubscribersInCurrentAttempt = [];
            const subscribersResult = await Promise.all(subscribersInCurrentAttempt.map(async ({ id, subscriber }) => {
                try {
                    const vimsEvent = { name: eventName, payload, metadata };
                    const res = await subscriber(vimsEvent, eventName);
                    completedSubscribersInCurrentAttempt.push(id);
                    return res;
                }
                catch (err) {
                    this.logger.warn(`An error occurred while processing sub ${id} for ${eventName}:`);
                    return err;
                }
            }));
            const didSubscribersFail = completedSubscribersInCurrentAttempt.length !== subscribersInCurrentAttempt.length;
            const isRetriesConfigured = configuredAttempts > 1;
            const shouldRetry = didSubscribersFail && isRetriesConfigured && !isFinalAttempt;
            if (shouldRetry) {
                job.data.completedSubscriberIds = [
                    ...completedSubscribers,
                    ...completedSubscribersInCurrentAttempt,
                ];
                await job.updateData(job.data);
                const errorMsg = `One or more subscribers of ${eventName} failed. Retrying...`;
                this.logger.warn(errorMsg);
                throw new Error(errorMsg);
            }
            if (didSubscribersFail && !isFinalAttempt) {
                this.logger.warn(`One or more subscribers of ${eventName} failed. Retrying is not configured.`);
            }
            return subscribersResult;
        };
        this.logger = logger;
        this.queueName = (_a = options.queueName) !== null && _a !== void 0 ? _a : "vims-events";
        this.jobOptions = (_b = options.jobOptions) !== null && _b !== void 0 ? _b : {};
        this.connection = new Redis(options.redisUrl || "redis://localhost:6379", {
            maxRetriesPerRequest: null, // BullMQ requires this
        });
        this.queue = new Queue(this.queueName, {
            connection: this.connection,
            defaultJobOptions: { removeOnComplete: true, removeOnFail: false }
        });
        this.worker = new Worker(this.queueName, this.workerJobHandler, {
            connection: this.connection,
            autorun: true,
        });
        this.worker.on("failed", (job, err) => {
            this.logger.error(`[RedisEventBus] Job failed: ${job === null || job === void 0 ? void 0 : job.id} (${job === null || job === void 0 ? void 0 : job.name})`, err);
        });
    }
    async emit(eventOrEvents, options) {
        var _a;
        const eventsDataArray = Array.isArray(eventOrEvents) ? eventOrEvents : [eventOrEvents];
        if (eventsDataArray.length === 0)
            return;
        const _b = (options || {}), { groupedEventsTTL = 600 } = _b, restOptions = __rest(_b, ["groupedEventsTTL"]);
        const eventsToEmit = eventsDataArray.filter((e) => { var _a; return !((_a = e.metadata) === null || _a === void 0 ? void 0 : _a.eventGroupId); });
        const eventsToGroup = eventsDataArray.filter((e) => { var _a; return (_a = e.metadata) === null || _a === void 0 ? void 0 : _a.eventGroupId; });
        const groupEventsMap = new Map();
        for (const ev of eventsToGroup) {
            const groupId = ev.metadata.eventGroupId;
            const groupEvents = (_a = groupEventsMap.get(groupId)) !== null && _a !== void 0 ? _a : [];
            groupEvents.push(ev);
            groupEventsMap.set(groupId, groupEvents);
        }
        const promises = [];
        if (eventsToEmit.length) {
            const jobsMap = eventsToEmit.map((ev) => {
                const finalOpts = Object.assign(Object.assign(Object.assign({ attempts: 1 }, this.jobOptions), restOptions), ev.options);
                return {
                    name: ev.name,
                    data: {
                        eventName: ev.name,
                        payload: ev.payload,
                        metadata: ev.metadata,
                    },
                    opts: finalOpts,
                };
            });
            if (jobsMap.length > 0) {
                promises.push(this.queue.addBulk(jobsMap));
            }
        }
        for (const [groupId, events] of groupEventsMap.entries()) {
            if (!events.length)
                continue;
            await this.connection.expire(`staging:${groupId}`, groupedEventsTTL);
            promises.push(this.connection.rpush(`staging:${groupId}`, ...events.map(ev => JSON.stringify({
                name: ev.name,
                data: {
                    eventName: ev.name,
                    payload: ev.payload,
                    metadata: ev.metadata,
                },
                opts: Object.assign(Object.assign(Object.assign({ attempts: 1 }, this.jobOptions), restOptions), ev.options)
            }))));
        }
        await Promise.all(promises);
    }
    async releaseGroupedEvents(eventGroupId) {
        const rawEvents = await this.connection.lrange(`staging:${eventGroupId}`, 0, -1);
        if (!rawEvents.length)
            return;
        const jobsMap = rawEvents.map(s => JSON.parse(s));
        await this.queue.addBulk(jobsMap);
        await this.clearGroupedEvents(eventGroupId);
    }
    async clearGroupedEvents(eventGroupId) {
        if (!eventGroupId)
            return;
        await this.connection.unlink(`staging:${eventGroupId}`);
    }
    async subscribe(eventName, subscriber, context) {
        const name = String(eventName);
        const id = (context === null || context === void 0 ? void 0 : context.subscriberId) || `sub_${Math.random().toString(36).substring(7)}`;
        let subs = this.subscribers.get(name);
        if (!subs) {
            subs = [];
            this.subscribers.set(name, subs);
        }
        subs.push({ id: id, subscriber });
        return this;
    }
    async unsubscribe(eventName, subscriber) {
        const name = String(eventName);
        const subs = this.subscribers.get(name);
        if (subs) {
            this.subscribers.set(name, subs.filter(s => s.subscriber !== subscriber));
        }
        return this;
    }
    async destroy() {
        await this.worker.close();
        await this.queue.close();
        this.connection.disconnect();
    }
}
