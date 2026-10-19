CREATE TABLE "settlement" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"space_id" uuid NOT NULL,
	"from_user_id" text NOT NULL,
	"to_user_id" text NOT NULL,
	"amount" bigint NOT NULL,
	"date" date NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settlement_amount_positive" CHECK ("settlement"."amount" > 0),
	CONSTRAINT "settlement_two_members" CHECK ("settlement"."from_user_id" <> "settlement"."to_user_id")
);
--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "paid_by" text;--> statement-breakpoint
ALTER TABLE "settlement" ADD CONSTRAINT "settlement_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement" ADD CONSTRAINT "settlement_from_user_id_user_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement" ADD CONSTRAINT "settlement_to_user_id_user_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement" ADD CONSTRAINT "settlement_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "settlement_space_id_date_index" ON "settlement" USING btree ("space_id","date" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_paid_by_user_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;