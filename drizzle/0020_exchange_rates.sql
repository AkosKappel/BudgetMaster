CREATE TABLE "exchange_rate" (
	"date" date NOT NULL,
	"currency" char(3) NOT NULL,
	"rate" numeric(18, 8) NOT NULL,
	CONSTRAINT "exchange_rate_date_currency_pk" PRIMARY KEY("date","currency")
);
--> statement-breakpoint
-- Units of a currency for one euro on a day: the latest rate on or before it, else the
-- earliest one known (older transactions than the stored history). Null without any rate.
CREATE FUNCTION per_euro(currency char(3), on_date date) RETURNS numeric
LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN currency = 'EUR' THEN 1::numeric ELSE coalesce(
    (SELECT rate FROM exchange_rate r WHERE r.currency = per_euro.currency AND r.date <= on_date ORDER BY r.date DESC LIMIT 1),
    (SELECT rate FROM exchange_rate r WHERE r.currency = per_euro.currency ORDER BY r.date LIMIT 1)
  ) END
$$;--> statement-breakpoint
-- An amount in minor units of one currency, in minor units of another, at that day's rate.
-- Yen has no minor unit; every other supported currency has two decimals.
CREATE FUNCTION convert_minor(amount bigint, from_currency char(3), to_currency char(3), on_date date) RETURNS bigint
LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN from_currency = to_currency THEN amount ELSE round(
    amount::numeric
      / power(10, CASE WHEN from_currency = 'JPY' THEN 0 ELSE 2 END)
      / per_euro(from_currency, on_date)
      * per_euro(to_currency, on_date)
      * power(10, CASE WHEN to_currency = 'JPY' THEN 0 ELSE 2 END)
  )::bigint END
$$;
