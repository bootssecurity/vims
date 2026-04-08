import { MikroORM, Options, Entity } from "@mikro-orm/core";
import { PostgreSqlDriver } from "@mikro-orm/postgresql";
import { BaseEntity } from "./base-entity.js";

@Entity()
class DummyEntity extends BaseEntity {
  // Required by MikroORM so it doesn't crash on completely empty init
}

/**
 * Common configuration for initializing the MikroORM PostgreSQL connection 
 * across the Vims framework.
 */
export async function createMikroOrmConnection(
  url: string,
  entities: any[] = [],
  debug = false
): Promise<MikroORM<PostgreSqlDriver>> {
  const ormOptions: Options<PostgreSqlDriver> = {
    clientUrl: url,
    driver: PostgreSqlDriver,
    entities: entities.length > 0 ? entities : [DummyEntity],
    debug,
    allowGlobalContext: true,
  };

  const orm = await MikroORM.init(ormOptions);
  return orm;
}
