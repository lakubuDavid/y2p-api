CREATE TABLE `tokens` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`refresh_token` text NOT NULL,
	`is_revoked` integer DEFAULT false NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT 1738998336777 NOT NULL
);
--> statement-breakpoint
DROP TABLE `reservation`;