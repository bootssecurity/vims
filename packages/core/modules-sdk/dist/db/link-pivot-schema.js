import { pgTable, uuid, text, timestamp, index, unique } from "drizzle-orm/pg-core";
// ── link_pivots ───────────────────────────────────────────────────────────────
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
export const linkPivots = pgTable("link_pivots", {
    id: uuid("id").defaultRandom().primaryKey(),
    linkId: text("link_id").notNull(),
    sourceModule: text("source_module").notNull(),
    sourceId: text("source_id").notNull(),
    targetModule: text("target_module").notNull(),
    targetId: text("target_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    unique("link_pivots_edge_unique").on(table.linkId, table.sourceId, table.targetId),
    index("link_pivots_source_idx").on(table.sourceModule, table.sourceId),
    index("link_pivots_target_idx").on(table.targetModule, table.targetId),
    index("link_pivots_link_id_idx").on(table.linkId),
]);
