PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_reservation` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reservationNumber` text NOT NULL,
	`petId` integer NOT NULL,
	`userId` integer NOT NULL,
	`assigneeId` integer,
	`createdAt` integer,
	`date` text NOT NULL,
	`timeFrom` text NOT NULL,
	`timeTo` text NOT NULL,
	`status` text DEFAULT 'oncoming' NOT NULL,
	`service` text NOT NULL,
	FOREIGN KEY (`petId`) REFERENCES `pet`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigneeId`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_reservation`("id", "reservationNumber", "petId", "userId", "assigneeId", "createdAt", "date", "timeFrom", "timeTo", "status", "service") SELECT "id", "reservationNumber", "petId", "userId", "assigneeId", "createdAt", "date", "timeFrom", "timeTo", "status", "service" FROM `reservation`;--> statement-breakpoint
DROP TABLE `reservation`;--> statement-breakpoint
ALTER TABLE `__new_reservation` RENAME TO `reservation`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `reservation_reservationNumber_unique` ON `reservation` (`reservationNumber`);