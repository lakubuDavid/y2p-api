CREATE TABLE `magic_link` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`token` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`used` integer DEFAULT false,
	`createdAt` integer,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `magic_link_token_unique` ON `magic_link` (`token`);