CREATE TABLE "transaction_split" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"space_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"note" text,
	CONSTRAINT "transaction_split_amount_positive" CHECK ("transaction_split"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "transaction" DROP CONSTRAINT "transaction_shape";--> statement-breakpoint
ALTER TABLE "transaction_split" ADD CONSTRAINT "transaction_split_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_split" ADD CONSTRAINT "transaction_split_transaction_id_space_id_transaction_id_space_id_fk" FOREIGN KEY ("transaction_id","space_id") REFERENCES "public"."transaction"("id","space_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_split" ADD CONSTRAINT "transaction_split_category_id_space_id_category_id_space_id_fk" FOREIGN KEY ("category_id","space_id") REFERENCES "public"."category"("id","space_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transaction_split_transaction_id_index" ON "transaction_split" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "transaction_split_category_id_index" ON "transaction_split" USING btree ("category_id");--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_shape" CHECK (("transaction"."type" = 'transfer' and "transaction"."to_wallet_id" is not null and "transaction"."to_wallet_id" <> "transaction"."wallet_id" and "transaction"."category_id" is null)
      or ("transaction"."type" <> 'transfer' and "transaction"."to_wallet_id" is null and "transaction"."to_amount" is null));