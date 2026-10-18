CREATE TABLE "categorization_rule" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"space_id" uuid NOT NULL,
	"type" "category_type" NOT NULL,
	"match" text NOT NULL,
	"category_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categorization_rule_spaceId_type_match_unique" UNIQUE("space_id","type","match"),
	CONSTRAINT "categorization_rule_match_lowercase" CHECK ("categorization_rule"."match" = lower("categorization_rule"."match"))
);
--> statement-breakpoint
ALTER TABLE "categorization_rule" ADD CONSTRAINT "categorization_rule_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categorization_rule" ADD CONSTRAINT "categorization_rule_category_id_space_id_type_category_id_space_id_type_fk" FOREIGN KEY ("category_id","space_id","type") REFERENCES "public"."category"("id","space_id","type") ON DELETE cascade ON UPDATE no action;