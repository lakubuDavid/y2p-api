ALTER TABLE `tokens` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL DEFAULT 1742619299567;--> statement-breakpoint
ALTER TABLE `user` ADD `surname` text NOT NULL DEFAULT "";
