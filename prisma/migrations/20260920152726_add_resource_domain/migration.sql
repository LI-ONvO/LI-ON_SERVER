-- CreateTable
CREATE TABLE `resource` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `session_id` INTEGER NULL,
    `jm_cd` VARCHAR(10) NULL,
    `title` VARCHAR(255) NOT NULL,
    `url` VARCHAR(2048) NOT NULL,
    `type` VARCHAR(20) NOT NULL DEFAULT 'LINK',
    `memo` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `resource` ADD CONSTRAINT `resource_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resource` ADD CONSTRAINT `resource_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `chat_session`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resource` ADD CONSTRAINT `resource_jm_cd_fkey` FOREIGN KEY (`jm_cd`) REFERENCES `certification`(`jm_cd`) ON DELETE SET NULL ON UPDATE CASCADE;
