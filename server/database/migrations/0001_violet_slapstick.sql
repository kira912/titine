CREATE TABLE "station_shortages" (
	"station_id" integer NOT NULL,
	"fuel" text NOT NULL,
	"since" timestamp with time zone NOT NULL,
	CONSTRAINT "station_shortages_station_id_fuel_pk" PRIMARY KEY("station_id","fuel")
);
--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN "services" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "station_shortages" ADD CONSTRAINT "station_shortages_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE cascade ON UPDATE no action;