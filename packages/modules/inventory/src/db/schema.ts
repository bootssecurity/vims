import {
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { organizations, rooftops } from "@vims/tenancy/db/schema";

export const vehicleConditionEnum = pgEnum("vehicle_condition", ["new", "used", "cpo"]);

export const vehicles = pgTable("inventory_vehicles", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  rooftopId: uuid("rooftop_id").references(() => rooftops.id, { onDelete: "set null" }),
  vin: varchar("vin", { length: 17 }).notNull().unique(),
  stockNumber: varchar("stock_number", { length: 60 }).notNull(),
  year: integer("year").notNull(),
  make: varchar("make", { length: 80 }).notNull(),
  model: varchar("model", { length: 120 }).notNull(),
  trim: varchar("trim", { length: 120 }),
  condition: vehicleConditionEnum("condition").notNull(),
  mileage: integer("mileage"),
  status: varchar("status", { length: 60 }).default("draft").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const vehiclePricing = pgTable("inventory_vehicle_pricing", {
  id: uuid("id").defaultRandom().primaryKey(),
  vehicleId: uuid("vehicle_id")
    .references(() => vehicles.id, { onDelete: "cascade" })
    .notNull(),
  msrp: numeric("msrp", { precision: 12, scale: 2 }),
  salePrice: numeric("sale_price", { precision: 12, scale: 2 }),
  internetPrice: numeric("internet_price", { precision: 12, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  effectiveAt: timestamp("effective_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const vehicleMedia = pgTable("inventory_vehicle_media", {
  id: uuid("id").defaultRandom().primaryKey(),
  vehicleId: uuid("vehicle_id")
    .references(() => vehicles.id, { onDelete: "cascade" })
    .notNull(),
  assetKey: text("asset_key").notNull(),
  assetType: varchar("asset_type", { length: 40 }).default("image").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
