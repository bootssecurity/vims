import { EntityManager, EntityRepository, FilterQuery, FindOptions } from "@mikro-orm/postgresql";
export interface Context {
    transactionManager?: EntityManager;
    manager?: EntityManager;
    [key: string]: unknown;
}
/**
 * Standard repository implementation matching Vims mikro-orm-repository
 */
export declare class MikroOrmBaseRepository<T extends object> {
    protected readonly manager: EntityManager;
    protected readonly entity: new (...args: any[]) => T;
    constructor(manager: EntityManager, entity: new (...args: any[]) => T);
    protected getActiveManager(context?: Context): EntityManager;
    protected getRepository(context?: Context): EntityRepository<T>;
    find(options?: FilterQuery<T>, config?: FindOptions<T>, context?: Context): Promise<T[]>;
    findAndCount(options?: FilterQuery<T>, config?: FindOptions<T>, context?: Context): Promise<[T[], number]>;
    create(data: any[], context?: Context): Promise<T[]>;
    update(entities: T[], context?: Context): Promise<T[]>;
    delete(options: FilterQuery<T>, context?: Context): Promise<void>;
    softDelete(options: FilterQuery<T>, context?: Context): Promise<void>;
    restore(options: FilterQuery<T>, context?: Context): Promise<void>;
}
