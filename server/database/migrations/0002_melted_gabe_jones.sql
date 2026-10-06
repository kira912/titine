CREATE TABLE "station_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"station_id" integer NOT NULL,
	"kind" text NOT NULL,
	"fuel" text,
	"reporter" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "station_reports" ADD CONSTRAINT "station_reports_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "station_reports_station_idx" ON "station_reports" USING btree ("station_id","created_at");--> statement-breakpoint
CREATE INDEX "station_reports_reporter_idx" ON "station_reports" USING btree ("reporter","created_at");