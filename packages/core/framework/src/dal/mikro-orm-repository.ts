import { EntityManager, EntityRepository, FilterQuery, FindOptions } from "@mikro-orm/postgresql";

export interface Context {
  transactionManager?: EntityManager;
  manager?: EntityManager;
  [key: string]: unknown;
}

/**
 * Standard repository implementation matching Vims mikro-orm-repository
 */
export class MikroOrmBaseRepository<T extends object> {
  constructor(
    protected readonly manager: EntityManager,
    protected readonly entity: new (...args: any[]) => T
  ) { }

  protected getActiveManager(context?: Context): EntityManager {
    return context?.transactionManager ?? context?.manager ?? this.manager;
  }

  protected getRepository(context?: Context): EntityRepository<T> {
    return this.getActiveManager(context).getRepository(this.entity);
  }

  async find(
    options: FilterQuery<T> = {},
    config: FindOptions<T> = {},
    context?: Context
  ): Promise<T[]> {
    return this.getRepository(context).find(options, config);
  }

  async findAndCount(
    options: FilterQuery<T> = {},
    config: FindOptions<T> = {},
    context?: Context
  ): Promise<[T[], number]> {
    return this.getRepository(context).findAndCount(options, config);
  }

  async create(data: any[], context?: Context): Promise<T[]> {
    const manager = this.getActiveManager(context);
    const entities = data.map((d) => manager.create(this.entity, d));
    manager.persist(entities);
    return entities;
  }

  async update(entities: T[], context?: Context): Promise<T[]> {
    const manager = this.getActiveManager(context);
    manager.persist(entities);
    return entities;
  }

  async delete(options: FilterQuery<T>, context?: Context): Promise<void> {
    const manager = this.getActiveManager(context);
    const repo = this.getRepository(context);
    const entities = await repo.find(options);
    manager.remove(entities);
  }

  async softDelete(options: FilterQuery<T>, context?: Context): Promise<void> {
    const manager = this.getActiveManager(context);
    const entities = await this.getRepository(context).find(options);
    for (const entity of entities) {
      if ("deleted_at" in entity) {
        (entity as any).deleted_at = new Date();
      }
    }
    manager.persist(entities);
  }

  async restore(options: FilterQuery<T>, context?: Context): Promise<void> {
    const manager = this.getActiveManager(context);
    // Disregard soft-delete filters to find deleted items
    const findConfig: FindOptions<T> = { filters: { softDeletable: false } };
    const entities = await this.getRepository(context).find(options, findConfig);
    for (const entity of entities) {
      if ("deleted_at" in entity) {
        (entity as any).deleted_at = null;
      }
    }
    manager.persist(entities);
  }
}
