PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_pet` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`owner` integer NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`owner`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_pet`("id", "name", "owner", "createdAt") SELECT "id", "name", "owner", "createdAt" FROM `pet`;--> statement-breakpoint
DROP TABLE `pet`;--> statement-breakpoint
ALTER TABLE `__new_pet` RENAME TO `pet`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_staff` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`department` text NOT NULL,
	`userId` integer NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_staff`("id", "department", "userId", "createdAt") SELECT "id", "department", "userId", "createdAt" FROM `staff`;--> statement-breakpoint
DROP TABLE `staff`;--> statement-breakpoint
ALTER TABLE `__new_staff` RENAME TO `staff`;--> statement-breakpoint
ALTER TABLE `tokens` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL DEFAULT 1739093578886;