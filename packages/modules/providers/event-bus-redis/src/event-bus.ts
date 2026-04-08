import { Queue, Worker, type JobsOptions, type Job } from "bullmq";
import Redis from "ioredis";

export type VimsEvent<T = unknown> = {
  name: string;
  payload: T;
  options?: Record<string, unknown>;
  metadata?: { eventGroupId?: string; [key: string]: unknown };
};

export type SubscriberFunction = (payload: any, eventName: string) => Promise<unknown> | unknown;

export type SubscriberRegistryEntry = {
  id: string;
  subscriber: SubscriberFunction;
};

interface Logger {
  info(msg: string, meta?: any): void;
  error(msg: string, meta?: any): void;
  warn(msg: string, meta?: any): void;
  debug?(msg: string, meta?: any): void;
}

type RedisEventBusOptions = {
  redisUrl: string;
  queueName?: string;
  jobOptions?: JobsOptions;
};

export class RedisEventBus {
  private readonly logger: Logger;
  private readonly queueName: string;
  private readonly connection: Redis;
  private readonly queue: Queue;
  private readonly worker: Worker;
  private readonly subscribers = new Map<string, SubscriberRegistryEntry[]>();
  private readonly jobOptions: JobsOptions;

  constructor({ 
    logger, 
    options 
  }: { 
    logger: Logger; 
    options: RedisEventBusOptions 
  }) {
    this.logger = logger;
    this.queueName = options.queueName ?? "vims-events";
    this.jobOptions = options.jobOptions ?? {};
    
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
      this.logger.error(`[RedisEventBus] Job failed: ${job?.id} (${job?.name})`, err);
    });
  }

  async emit<T = unknown>(
    eventOrEvents: VimsEvent<T> | VimsEvent<T>[],
    options?: { groupedEventsTTL?: number } & JobsOptions
  ): Promise<void> {
    const eventsDataArray = Array.isArray(eventOrEvents) ? eventOrEvents : [eventOrEvents];
    if (eventsDataArray.length === 0) return;

    const { groupedEventsTTL = 600, ...restOptions } = (options || {});

    const eventsToEmit = eventsDataArray.filter((e) => !e.metadata?.eventGroupId);
    const eventsToGroup = eventsDataArray.filter((e) => e.metadata?.eventGroupId);

    const groupEventsMap = new Map<string, VimsEvent<T>[]>();
    for (const ev of eventsToGroup) {
      const groupId = ev.metadata!.eventGroupId!;
      const groupEvents = groupEventsMap.get(groupId) ?? [];
      groupEvents.push(ev);
      groupEventsMap.set(groupId, groupEvents);
    }

    const promises: Promise<unknown>[] = [];

    if (eventsToEmit.length) {
      const jobsMap = eventsToEmit.map((ev) => {
        const finalOpts = { attempts: 1, ...this.jobOptions, ...restOptions, ...ev.options };
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
      if (!events.length) continue;
      await this.connection.expire(`staging:${groupId}`, groupedEventsTTL);
      promises.push(
        this.connection.rpush(
          `staging:${groupId}`, 
          ...events.map(ev => JSON.stringify({
            name: ev.name,
            data: {
              eventName: ev.name,
              payload: ev.payload,
              metadata: ev.metadata,
            },
            opts: { attempts: 1, ...this.jobOptions, ...restOptions, ...ev.options }
          }))
        )
      );
    }

    await Promise.all(promises);
  }

  async releaseGroupedEvents(eventGroupId: string): Promise<void> {
    const rawEvents = await this.connection.lrange(`staging:${eventGroupId}`, 0, -1);
    if (!rawEvents.length) return;

    const jobsMap = rawEvents.map(s => JSON.parse(s));
    await this.queue.addBulk(jobsMap);
    await this.clearGroupedEvents(eventGroupId);
  }

  async clearGroupedEvents(eventGroupId: string): Promise<void> {
    if (!eventGroupId) return;
    await this.connection.unlink(`staging:${eventGroupId}`);
  }

  async subscribe(
    eventName: string | symbol,
    subscriber: SubscriberFunction,
    context?: Record<string, unknown>
  ): Promise<this> {
    const name = String(eventName);
    const id = context?.subscriberId || `sub_${Math.random().toString(36).substring(7)}`;

    let subs = this.subscribers.get(name);
    if (!subs) {
      subs = [];
      this.subscribers.set(name, subs);
    }
    subs.push({ id: id as string, subscriber });
    return this;
  }

  async unsubscribe(
    eventName: string | symbol,
    subscriber: SubscriberFunction
  ): Promise<this> {
    const name = String(eventName);
    const subs = this.subscribers.get(name);
    if (subs) {
      this.subscribers.set(name, subs.filter(s => s.subscriber !== subscriber));
    }
    return this;
  }

  private workerJobHandler = async <T>(job: Job): Promise<unknown> => {
    const { eventName, payload, metadata } = job.data;
    
    const eventSubscribers = this.subscribers.get(eventName) || [];
    const wildcardSubscribers = this.subscribers.get("*") || [];
    const allSubscribers = eventSubscribers.concat(wildcardSubscribers);

    // Pull already completed subscribers from the job data
    const completedSubscribers: string[] = job.data.completedSubscriberIds || [];

    // Filter out already completed subscribers
    const subscribersInCurrentAttempt = allSubscribers.filter(
      (sub) => sub.id && !completedSubscribers.includes(sub.id)
    );

    const currentAttempt = job.attemptsMade;
    const isRetry = currentAttempt > 1;
    const configuredAttempts = job.opts.attempts || 1;
    const isFinalAttempt = currentAttempt === configuredAttempts;

    if (isRetry && isFinalAttempt) {
      this.logger.info(`Final retry attempt for ${eventName}`);
    }

    const completedSubscribersInCurrentAttempt: string[] = [];

    const subscribersResult = await Promise.all(
      subscribersInCurrentAttempt.map(async ({ id, subscriber }) => {
        try {
          const vimsEvent = { name: eventName, payload, metadata };
          const res = await subscriber(vimsEvent, eventName);
          completedSubscribersInCurrentAttempt.push(id);
          return res;
        } catch (err) {
          this.logger.warn(`An error occurred while processing sub ${id} for ${eventName}:`);
          return err;
        }
      })
    );

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

  async destroy(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
    this.connection.disconnect();
  }
}
