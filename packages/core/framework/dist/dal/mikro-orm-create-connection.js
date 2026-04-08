var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { MikroORM, Entity } from "@mikro-orm/core";
import { PostgreSqlDriver } from "@mikro-orm/postgresql";
import { BaseEntity } from "./base-entity.js";
let DummyEntity = class DummyEntity extends BaseEntity {
};
DummyEntity = __decorate([
    Entity()
], DummyEntity);
/**
 * Common configuration for initializing the MikroORM PostgreSQL connection
 * across the Vims framework.
 */
export async function createMikroOrmConnection(url, entities = [], debug = false) {
    const ormOptions = {
        clientUrl: url,
        driver: PostgreSqlDriver,
        entities: entities.length > 0 ? entities : [DummyEntity],
        debug,
        allowGlobalContext: true,
    };
    const orm = await MikroORM.init(ormOptions);
    return orm;
}
