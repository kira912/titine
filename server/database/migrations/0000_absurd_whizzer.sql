CREATE TABLE "station_prices" (
	"station_id" integer NOT NULL,
	"fuel" text NOT NULL,
	"price" double precision NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "station_prices_station_id_fuel_pk" PRIMARY KEY("station_id","fuel")
);
--> statement-breakpoint
CREATE TABLE "stations" (
	"id" integer PRIMARY KEY NOT NULL,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"city_slug" text NOT NULL,
	"postal_code" text NOT NULL,
	"department" text NOT NULL,
	"always_open" boolean DEFAULT false NOT NULL,
	"seen_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "station_prices" ADD CONSTRAINT "station_prices_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stations_lat_lon_idx" ON "stations" USING btree ("lat","lon");--> statement-breakpoint
CREATE INDEX "stations_city_slug_idx" ON "stations" USING btree ("city_slug");