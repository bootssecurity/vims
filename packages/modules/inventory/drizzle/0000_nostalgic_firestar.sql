CREATE TYPE "public"."vehicle_condition" AS ENUM('new', 'used', 'cpo');--> statement-breakpoint
CREATE TABLE "inventory_vehicle_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"asset_key" text NOT NULL,
	"asset_type" varchar(40) DEFAULT 'image' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_vehicle_pricing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"msrp" numeric(12, 2),
	"sale_price" numeric(12, 2),
	"internet_price" numeric(12, 2),
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"effective_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"rooftop_id" uuid,
	"vin" varchar(17) NOT NULL,
	"stock_number" varchar(60) NOT NULL,
	"year" integer NOT NULL,
	"make" varchar(80) NOT NULL,
	"model" varchar(120) NOT NULL,
	"trim" varchar(120),
	"condition" "vehicle_condition" NOT NULL,
	"mileage" integer,
	"status" varchar(60) DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_vehicles_vin_unique" UNIQUE("vin")
);
--> statement-breakpoint
ALTER TABLE "inventory_vehicle_media" ADD CONSTRAINT "inventory_vehicle_media_vehicle_id_inventory_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."inventory_vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_vehicle_pricing" ADD CONSTRAINT "inventory_vehicle_pricing_vehicle_id_inventory_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."inventory_vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_vehicles" ADD CONSTRAINT "inventory_vehicles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_vehicles" ADD CONSTRAINT "inventory_vehicles_rooftop_id_rooftops_id_fk" FOREIGN KEY ("rooftop_id") REFERENCES "public"."rooftops"("id") ON DELETE set null ON UPDATE no action;