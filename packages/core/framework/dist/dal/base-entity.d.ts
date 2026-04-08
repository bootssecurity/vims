import { Opt } from "@mikro-orm/core";
/**
 * Vims standard BaseEntity definition mimicking exact MikroORM properties
 */
export declare abstract class BaseEntity {
    id: string;
    created_at: Date & Opt;
    updated_at: Date & Opt;
    deleted_at: Date | null;
}
