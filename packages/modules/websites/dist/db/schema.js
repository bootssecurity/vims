import { boolean, jsonb, pgTable, timestamp, uuid, varchar, } from "drizzle-orm/pg-core";
import { organizations } from "@vims/tenancy/db/schema";
export const websites = pgTable("website_sites", {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
        .references(() => organizations.id, { onDelete: "cascade" })
        .notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    subdomain: varchar("subdomain", { length: 120 }).notNull().unique(),
    themeKey: varchar("theme_key", { length: 80 }).default("default").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
export const websitePages = pgTable("website_pages", {
    id: uuid("id").defaultRandom().primaryKey(),
    websiteId: uuid("website_id")
        .references(() => websites.id, { onDelete: "cascade" })
        .notNull(),
    slug: varchar("slug", { length: 160 }).notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    isHomepage: boolean("is_homepage").default(false).notNull(),
    sections: jsonb("sections").default([]).notNull(),
    seo: jsonb("seo").default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
