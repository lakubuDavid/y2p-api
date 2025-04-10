DROP INDEX "magic_link_token_unique";--> statement-breakpoint
ALTER TABLE `magic_link` ALTER COLUMN "used" TO "used" integer NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `magic_link_token_unique` ON `magic_link` (`token`);--> statement-breakpoint
ALTER TABLE `reservation` ALTER COLUMN "date" TO "date" text NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `verified` integer DEFAULT true;