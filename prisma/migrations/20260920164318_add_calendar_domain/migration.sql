-- CreateTable
CREATE TABLE `calendar_event` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `roadmap_step_id` INTEGER NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `start_at` DATETIME(3) NOT NULL,
    `end_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `alarm` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `event_id` INTEGER NOT NULL,
    `remind_at` DATETIME(3) NOT NULL,
    `sent_at` DATETIME(3) NULL,
    `status` ENUM('PENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',

    INDEX `alarm_status_remind_at_idx`(`status`, `remind_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `calendar_event` ADD CONSTRAINT `calendar_event_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_event` ADD CONSTRAINT `calendar_event_roadmap_step_id_fkey` FOREIGN KEY (`roadmap_step_id`) REFERENCES `roadmap_step`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alarm` ADD CONSTRAINT `alarm_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `calendar_event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
