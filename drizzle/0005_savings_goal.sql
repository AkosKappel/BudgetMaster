CREATE TABLE "savings_goal" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"space_id" uuid NOT NULL,
	"name" text NOT NULL,
	"wallet_id" uuid NOT NULL,
	"target_amount" bigint NOT NULL,
	"target_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "savings_goal_spaceId_name_unique" UNIQUE("space_id","name"),
	CONSTRAINT "savings_goal_target_positive" CHECK ("savings_goal"."target_amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "savings_goal" ADD CONSTRAINT "savings_goal_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_goal" ADD CONSTRAINT "savings_goal_wallet_id_space_id_wallet_id_space_id_fk" FOREIGN KEY ("wallet_id","space_id") REFERENCES "public"."wallet"("id","space_id") ON DELETE cascade ON UPDATE no action;