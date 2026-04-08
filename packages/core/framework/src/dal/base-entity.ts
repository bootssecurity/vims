import { PrimaryKey, Property, Opt } from "@mikro-orm/core";
import { v4 as uuidv4 } from "uuid";

/**
 * Vims standard BaseEntity definition mimicking exact MikroORM properties
 */
export abstract class BaseEntity {
  @PrimaryKey({ columnType: "text" })
  id: string = `ent_${uuidv4().replace(/-/g, "").substring(0, 26)}`;

  @Property({
    onCreate: () => new Date(),
    columnType: "timestamptz",
    defaultRaw: "now()",
  })
  created_at: Date & Opt = new Date();

  @Property({
    onCreate: () => new Date(),
    onUpdate: () => new Date(),
    columnType: "timestamptz",
    defaultRaw: "now()",
  })
  updated_at: Date & Opt = new Date();

  @Property({ columnType: "timestamptz", nullable: true })
  deleted_at: Date | null = null;
}
