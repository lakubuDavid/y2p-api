ALTER TABLE `tokens` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ALTER COLUMN "surname" TO "surname" text NOT NULL DEFAULT '';