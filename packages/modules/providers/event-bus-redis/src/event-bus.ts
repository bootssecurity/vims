import { Queue, Worker, type JobsOptions, type Job } from "bullmq";
import Redis from "ioredis";

export type VimsEvent<T = unknown> = {
  name: string;
  payload: T;
};

export type SubscriberFunction = (payload: any, eventName: string) => Promise<void>;

interface Logger {
  info(msg: string, meta?: any): void;
  error(msg: string, meta?: any): void;
  warn(msg: string, meta?: any): void;
  debug?(msg: string, meta?: any): void;
}

type RedisEventBusOptions = {
  redisUrl: string;
  queueName?: string;
};

export class RedisEventBus {
  private readonly logger: Logger;
  private readonly queueName: string;
  private readonly connection: Redis;
  private readonly queue: Queue;
  private readonly worker: Worker;
  private readonly subscribers = new Map<string, Set<SubscriberFunction>>();

  constructor({ 
    logger, 
    options 
  }: { 
    logger: Logger; 
    options: RedisEventBusOptions 
  }) {
    this.logger = logger;
    this.queueName = options.queueName ?? "vims-events";
    
    this.connection = new Redis(options.redisUrl || "redis://localhost:6379", {
      maxRetriesPerRequest: null, // BullMQ requires this
    });

    // Create the queue for emitting events
    this.queue = new Queue(this.queueName, { 
      connection: this.connection,
      defaultJobOptions: { removeOnComplete: true, removeOnFail: false } 
    });

    // Create the worker for processing events
    this.worker = new Worker(this.queueName, async (job: Job) => {
      await this.processJob(job);
    }, { connection: this.connection });

    this.worker.on("failed", (job, err) => {
      this.logger.error(`[RedisEventBus] Job failed: ${job?.id} (${job?.name})`, err);
    });
  }

  async emit<T = unknown>(
    eventOrEvents: VimsEvent<T> | VimsEvent<T>[],
    options?: { delay?: number; attempts?: number }
  ): Promise<void> {
    const events = Array.isArray(eventOrEvents) ? eventOrEvents : [eventOrEvents];
    if (events.length === 0) return;

    const jobsMap = events.map((ev) => {
      const jobOpts: JobsOptions = { ...options };
      if (options?.delay) jobOpts.delay = options.delay;
      if (options?.attempts) jobOpts.attempts = options.attempts;

      return {
        name: ev.name,
        data: ev,
        opts: jobOpts,
      };
    });

    await this.queue.addBulk(jobsMap);
  }

  async subscribe(
    eventName: string | symbol,
    subscriber: SubscriberFunction,
    context?: Record<string, unknown>
  ): Promise<this> {
    const name = String(eventName);
    let subs = this.subscribers.get(name);
    if (!subs) {
      subs = new Set();
      this.subscribers.set(name, subs);
    }
    subs.add(subscriber);
    return this;
  }

  async unsubscribe(
    eventName: string | symbol,
    subscriber: SubscriberFunction
  ): Promise<this> {
    const subs = this.subscribers.get(String(eventName));
    if (subs) {
      subs.delete(subscriber);
    }
    return this;
  }

  private async processJob(job: Job): Promise<void> {
    const eventName = job.name;
    const subs = this.subscribers.get(eventName);
    if (!subs || subs.size === 0) return;

    const eventData = job.data as VimsEvent;

    // Execute concurrently
    await Promise.all(
      Array.from(subs).map((sub) =>
        sub(eventData.payload, eventData.name).catch((err: unknown) => {
          this.logger.error(`[RedisEventBus] Subscriber error for ${eventName}`, err);
          throw err; // BullMQ catches this to mark job failed if not all subs succeed
        })
      )
    );
  }

  async destroy(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
    this.connection.disconnect();
  }
}
