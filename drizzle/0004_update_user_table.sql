ALTER TABLE `pet` ALTER COLUMN "specie" TO "specie" text NOT NULL DEFAULT 'unknown';--> statement-breakpoint
ALTER TABLE `tokens` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL DEFAULT 1742050214468;--> statement-breakpoint
ALTER TABLE `user` ALTER COLUMN "email" TO "email" text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `user` ALTER COLUMN "phoneNumber" TO "phoneNumber" text NOT NULL DEFAULT '';