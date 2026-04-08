/**
 * Standard repository implementation matching Vims mikro-orm-repository
 */
export class MikroOrmBaseRepository {
    constructor(manager, entity) {
        this.manager = manager;
        this.entity = entity;
    }
    getActiveManager(context) {
        var _a, _b;
        return (_b = (_a = context === null || context === void 0 ? void 0 : context.transactionManager) !== null && _a !== void 0 ? _a : context === null || context === void 0 ? void 0 : context.manager) !== null && _b !== void 0 ? _b : this.manager;
    }
    getRepository(context) {
        return this.getActiveManager(context).getRepository(this.entity);
    }
    async find(options = {}, config = {}, context) {
        return this.getRepository(context).find(options, config);
    }
    async findAndCount(options = {}, config = {}, context) {
        return this.getRepository(context).findAndCount(options, config);
    }
    async create(data, context) {
        const manager = this.getActiveManager(context);
        const entities = data.map((d) => manager.create(this.entity, d));
        manager.persist(entities);
        return entities;
    }
    async update(entities, context) {
        const manager = this.getActiveManager(context);
        manager.persist(entities);
        return entities;
    }
    async delete(options, context) {
        const manager = this.getActiveManager(context);
        const repo = this.getRepository(context);
        const entities = await repo.find(options);
        manager.remove(entities);
    }
    async softDelete(options, context) {
        const manager = this.getActiveManager(context);
        const entities = await this.getRepository(context).find(options);
        for (const entity of entities) {
            if ("deleted_at" in entity) {
                entity.deleted_at = new Date();
            }
        }
        manager.persist(entities);
    }
    async restore(options, context) {
        const manager = this.getActiveManager(context);
        // Disregard soft-delete filters to find deleted items
        const findConfig = { filters: { softDeletable: false } };
        const entities = await this.getRepository(context).find(options, findConfig);
        for (const entity of entities) {
            if ("deleted_at" in entity) {
                entity.deleted_at = null;
            }
        }
        manager.persist(entities);
    }
}
