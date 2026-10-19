CREATE TABLE "import" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"space_id" uuid NOT NULL,
	"wallet_id" uuid NOT NULL,
	"file_name" text,
	"count" integer NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "import_id_spaceId_unique" UNIQUE("id","space_id")
);
--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "import_id" uuid;--> statement-breakpoint
ALTER TABLE "import" ADD CONSTRAINT "import_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import" ADD CONSTRAINT "import_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import" ADD CONSTRAINT "import_wallet_id_space_id_wallet_id_space_id_fk" FOREIGN KEY ("wallet_id","space_id") REFERENCES "public"."wallet"("id","space_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "import_space_id_created_at_index" ON "import" USING btree ("space_id","created_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_import_id_import_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."import"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transaction_import_id_index" ON "transaction" USING btree ("import_id");