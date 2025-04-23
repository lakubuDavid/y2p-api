PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_pet` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`ownerId` integer NOT NULL,
	`specie` text DEFAULT 'unknown' NOT NULL,
	`createdAt` integer NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	FOREIGN KEY (`ownerId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_pet`("id", "name", "ownerId", "specie", "createdAt", "metadata") SELECT "id", "name", "ownerId", "specie", "createdAt", "metadata" FROM `pet`;--> statement-breakpoint
DROP TABLE `pet`;--> statement-breakpoint
ALTER TABLE `__new_pet` RENAME TO `pet`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
DROP INDEX "magic_link_token_unique";--> statement-breakpoint
DROP INDEX "reservation_reservationNumber_unique";--> statement-breakpoint
ALTER TABLE `reservation` ALTER COLUMN "status" TO "status" text NOT NULL DEFAULT 'oncoming';--> statement-breakpoint
CREATE UNIQUE INDEX `magic_link_token_unique` ON `magic_link` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `reservation_reservationNumber_unique` ON `reservation` (`reservationNumber`);--> statement-breakpoint
ALTER TABLE `reservation` ADD `assigneeId` integer REFERENCES staff(id);