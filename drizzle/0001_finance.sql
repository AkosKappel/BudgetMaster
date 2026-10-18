CREATE TYPE "public"."category_type" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TYPE "public"."frequency" AS ENUM('daily', 'weekly', 'monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."space_role" AS ENUM('owner', 'editor', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('income', 'expense', 'transfer');--> statement-breakpoint
CREATE TYPE "public"."wallet_type" AS ENUM('checking', 'savings', 'cash', 'credit_card', 'investment');--> statement-breakpoint
CREATE TABLE "budget" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"space_id" uuid NOT NULL,
	"category_id" uuid,
	"amount" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budget_spaceId_categoryId_unique" UNIQUE NULLS NOT DISTINCT("space_id","category_id"),
	CONSTRAINT "budget_amount_positive" CHECK ("budget"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"space_id" uuid NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"type" "category_type" NOT NULL,
	"color" text NOT NULL,
	"icon" text NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "category_spaceId_type_name_unique" UNIQUE("space_id","type","name"),
	CONSTRAINT "category_id_spaceId_unique" UNIQUE("id","space_id"),
	CONSTRAINT "category_id_spaceId_type_unique" UNIQUE("id","space_id","type"),
	CONSTRAINT "category_not_own_parent" CHECK ("category"."parent_id" <> "category"."id")
);
--> statement-breakpoint
CREATE TABLE "recurring_rule" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"space_id" uuid NOT NULL,
	"type" "transaction_type" NOT NULL,
	"wallet_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"category_id" uuid,
	"to_wallet_id" uuid,
	"to_amount" bigint,
	"payee" text,
	"note" text,
	"frequency" "frequency" NOT NULL,
	"interval" integer DEFAULT 1 NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"next_date" date,
	"paused" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_rule_amount_positive" CHECK ("recurring_rule"."amount" > 0),
	CONSTRAINT "recurring_rule_to_amount_positive" CHECK ("recurring_rule"."to_amount" is null or "recurring_rule"."to_amount" > 0),
	CONSTRAINT "recurring_rule_shape" CHECK (("recurring_rule"."type" = 'transfer' and "recurring_rule"."to_wallet_id" is not null and "recurring_rule"."to_wallet_id" <> "recurring_rule"."wallet_id" and "recurring_rule"."category_id" is null)
      or ("recurring_rule"."type" <> 'transfer' and "recurring_rule"."to_wallet_id" is null and "recurring_rule"."to_amount" is null and "recurring_rule"."category_id" is not null)),
	CONSTRAINT "recurring_rule_interval_positive" CHECK ("recurring_rule"."interval" > 0),
	CONSTRAINT "recurring_rule_end_after_start" CHECK ("recurring_rule"."end_date" is null or "recurring_rule"."end_date" >= "recurring_rule"."start_date")
);
--> statement-breakpoint
CREATE TABLE "space" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"name" text NOT NULL,
	"personal_owner_id" text,
	"base_currency" char(3) DEFAULT 'EUR' NOT NULL,
	"budget_month_start_day" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "space_personalOwnerId_unique" UNIQUE("personal_owner_id"),
	CONSTRAINT "space_budget_month_start_day_range" CHECK ("space"."budget_month_start_day" between 1 and 28)
);
--> statement-breakpoint
CREATE TABLE "space_invite" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"space_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "space_role" NOT NULL,
	"token_hash" text NOT NULL,
	"invited_by" text,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "space_invite_tokenHash_unique" UNIQUE("token_hash"),
	CONSTRAINT "space_invite_not_owner" CHECK ("space_invite"."role" <> 'owner')
);
--> statement-breakpoint
CREATE TABLE "space_member" (
	"space_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "space_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "space_member_space_id_user_id_pk" PRIMARY KEY("space_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "tag" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"space_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tag_spaceId_name_unique" UNIQUE("space_id","name"),
	CONSTRAINT "tag_id_spaceId_unique" UNIQUE("id","space_id")
);
--> statement-breakpoint
CREATE TABLE "transaction" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"space_id" uuid NOT NULL,
	"type" "transaction_type" NOT NULL,
	"wallet_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"category_id" uuid,
	"to_wallet_id" uuid,
	"to_amount" bigint,
	"payee" text,
	"note" text,
	"date" date NOT NULL,
	"recurring_rule_id" uuid,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transaction_id_spaceId_unique" UNIQUE("id","space_id"),
	CONSTRAINT "transaction_amount_positive" CHECK ("transaction"."amount" > 0),
	CONSTRAINT "transaction_to_amount_positive" CHECK ("transaction"."to_amount" is null or "transaction"."to_amount" > 0),
	CONSTRAINT "transaction_shape" CHECK (("transaction"."type" = 'transfer' and "transaction"."to_wallet_id" is not null and "transaction"."to_wallet_id" <> "transaction"."wallet_id" and "transaction"."category_id" is null)
      or ("transaction"."type" <> 'transfer' and "transaction"."to_wallet_id" is null and "transaction"."to_amount" is null and "transaction"."category_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "transaction_tag" (
	"space_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "transaction_tag_transaction_id_tag_id_pk" PRIMARY KEY("transaction_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "wallet" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"space_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "wallet_type" NOT NULL,
	"currency" char(3) NOT NULL,
	"initial_balance" bigint DEFAULT 0 NOT NULL,
	"color" text NOT NULL,
	"icon" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wallet_spaceId_name_unique" UNIQUE("space_id","name"),
	CONSTRAINT "wallet_id_spaceId_unique" UNIQUE("id","space_id")
);
--> statement-breakpoint
ALTER TABLE "budget" ADD CONSTRAINT "budget_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget" ADD CONSTRAINT "budget_category_id_space_id_category_id_space_id_fk" FOREIGN KEY ("category_id","space_id") REFERENCES "public"."category"("id","space_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_parent_id_space_id_type_category_id_space_id_type_fk" FOREIGN KEY ("parent_id","space_id","type") REFERENCES "public"."category"("id","space_id","type") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_rule" ADD CONSTRAINT "recurring_rule_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_rule" ADD CONSTRAINT "recurring_rule_wallet_fk" FOREIGN KEY ("wallet_id","space_id") REFERENCES "public"."wallet"("id","space_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_rule" ADD CONSTRAINT "recurring_rule_to_wallet_fk" FOREIGN KEY ("to_wallet_id","space_id") REFERENCES "public"."wallet"("id","space_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_rule" ADD CONSTRAINT "recurring_rule_category_fk" FOREIGN KEY ("category_id","space_id") REFERENCES "public"."category"("id","space_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space" ADD CONSTRAINT "space_personal_owner_id_user_id_fk" FOREIGN KEY ("personal_owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_invite" ADD CONSTRAINT "space_invite_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_invite" ADD CONSTRAINT "space_invite_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_member" ADD CONSTRAINT "space_member_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_member" ADD CONSTRAINT "space_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag" ADD CONSTRAINT "tag_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_recurring_rule_id_recurring_rule_id_fk" FOREIGN KEY ("recurring_rule_id") REFERENCES "public"."recurring_rule"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_wallet_fk" FOREIGN KEY ("wallet_id","space_id") REFERENCES "public"."wallet"("id","space_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_to_wallet_fk" FOREIGN KEY ("to_wallet_id","space_id") REFERENCES "public"."wallet"("id","space_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_category_fk" FOREIGN KEY ("category_id","space_id") REFERENCES "public"."category"("id","space_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_tag" ADD CONSTRAINT "transaction_tag_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_tag" ADD CONSTRAINT "transaction_tag_transaction_id_space_id_transaction_id_space_id_fk" FOREIGN KEY ("transaction_id","space_id") REFERENCES "public"."transaction"("id","space_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_tag" ADD CONSTRAINT "transaction_tag_tag_id_space_id_tag_id_space_id_fk" FOREIGN KEY ("tag_id","space_id") REFERENCES "public"."tag"("id","space_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet" ADD CONSTRAINT "wallet_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "category_parent_id_index" ON "category" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "recurring_rule_space_id_next_date_index" ON "recurring_rule" USING btree ("space_id","next_date");--> statement-breakpoint
CREATE UNIQUE INDEX "space_invite_pending_unique" ON "space_invite" USING btree ("space_id","email") WHERE "space_invite"."accepted_at" is null;--> statement-breakpoint
CREATE INDEX "space_member_user_id_index" ON "space_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transaction_space_id_date_index" ON "transaction" USING btree ("space_id","date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "transaction_wallet_id_index" ON "transaction" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "transaction_to_wallet_id_index" ON "transaction" USING btree ("to_wallet_id");--> statement-breakpoint
CREATE INDEX "transaction_category_id_index" ON "transaction" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "transaction_tag_tag_id_index" ON "transaction_tag" USING btree ("tag_id");