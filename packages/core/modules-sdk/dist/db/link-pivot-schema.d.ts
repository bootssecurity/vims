/**
 * Pivot table that persists cross-module link edges.
 *
 * Schema:
 *   id              — stable edge identifier
 *   link_id         — the composite key from VimsLinkRegistry (sourceModule<>...targetModule)
 *   source_module   — source module key (e.g. "crm")
 *   source_id       — FK value in the source module (e.g. a lead UUID)
 *   target_module   — target module key (e.g. "inventory")
 *   target_id       — FK value in the target module (e.g. a vehicle UUID)
 *   created_at      — when the link was created
 *
 * A unique constraint on (link_id, source_id, target_id) prevents duplicate edges.
 */
export declare const linkPivots: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "link_pivots";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "link_pivots";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        linkId: import("drizzle-orm/pg-core").PgColumn<{
            name: "link_id";
            tableName: "link_pivots";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        sourceModule: import("drizzle-orm/pg-core").PgColumn<{
            name: "source_module";
            tableName: "link_pivots";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        sourceId: import("drizzle-orm/pg-core").PgColumn<{
            name: "source_id";
            tableName: "link_pivots";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        targetModule: import("drizzle-orm/pg-core").PgColumn<{
            name: "target_module";
            tableName: "link_pivots";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        targetId: import("drizzle-orm/pg-core").PgColumn<{
            name: "target_id";
            tableName: "link_pivots";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "link_pivots";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export type InsertLinkPivot = typeof linkPivots.$inferInsert;
export type SelectLinkPivot = typeof linkPivots.$inferSelect;
