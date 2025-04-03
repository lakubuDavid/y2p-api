CREATE TABLE `reservation` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`petId` integer,
	`userId` integer,
	`createdAt` integer,
	`date` integer NOT NULL,
	`status` text,
	FOREIGN KEY (`petId`) REFERENCES `pet`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `tokens` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL DEFAULT 1742049224440;--> statement-breakpoint
ALTER TABLE `user` ALTER COLUMN "type" TO "type" text DEFAULT 'anonymous';--> statement-breakpoint
ALTER TABLE `user` ADD `phoneNumber` text NOT NULL;--> statement-breakpoint
ALTER TABLE `pet` ADD `specie` text NOT NULL;