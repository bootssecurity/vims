import { MikroORM } from "@mikro-orm/core";
import { PostgreSqlDriver } from "@mikro-orm/postgresql";
/**
 * Common configuration for initializing the MikroORM PostgreSQL connection
 * across the Vims framework.
 */
export declare function createMikroOrmConnection(url: string, entities?: any[], debug?: boolean): Promise<MikroORM<PostgreSqlDriver>>;
