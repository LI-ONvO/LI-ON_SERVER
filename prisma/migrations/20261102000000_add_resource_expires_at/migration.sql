-- AlterTable
ALTER TABLE `resource` ADD COLUMN `expires_at` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `resource_expires_at_idx` ON `resource`(`expires_at`);
