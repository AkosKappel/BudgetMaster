DROP INDEX "activity_event_space_id_created_at_index";--> statement-breakpoint
DROP INDEX "import_space_id_created_at_index";--> statement-breakpoint
DROP INDEX "settlement_space_id_date_index";--> statement-breakpoint
DROP INDEX "transaction_space_id_date_id_index";--> statement-breakpoint
CREATE INDEX "activity_event_space_id_created_at_index" ON "activity_event" USING btree ("space_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "import_space_id_created_at_index" ON "import" USING btree ("space_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "settlement_space_id_date_index" ON "settlement" USING btree ("space_id","date" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "transaction_space_id_date_id_index" ON "transaction" USING btree ("space_id","date" DESC NULLS FIRST,"id" DESC NULLS FIRST);