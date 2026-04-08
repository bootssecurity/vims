import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { vehicles } from "@vims/inventory/db/schema";
import { organizations, rooftops } from "@vims/tenancy/db/schema";

export const leads = pgTable("crm_leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  rooftopId: uuid("rooftop_id").references(() => rooftops.id, { onDelete: "set null" }),
  firstName: varchar("first_name", { length: 120 }).notNull(),
  lastName: varchar("last_name", { length: 120 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 30 }),
  source: varchar("source", { length: 80 }).default("website").notNull(),
  stage: varchar("stage", { length: 80 }).default("New Lead").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const opportunities = pgTable("crm_opportunities", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id")
    .references(() => leads.id, { onDelete: "cascade" })
    .notNull(),
  vehicleId: uuid("vehicle_id").references(() => vehicles.id, { onDelete: "set null" }),
  stage: varchar("stage", { length: 80 }).default("New Lead").notNull(),
  ownerUserId: uuid("owner_user_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const activities = pgTable("crm_activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  opportunityId: uuid("opportunity_id")
    .references(() => opportunities.id, { onDelete: "cascade" })
    .notNull(),
  activityType: varchar("activity_type", { length: 60 }).notNull(),
  outcome: text("outcome"),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
