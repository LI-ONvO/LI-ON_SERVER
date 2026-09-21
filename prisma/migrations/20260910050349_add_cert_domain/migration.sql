-- CreateTable
CREATE TABLE `qual_detail` (
    `jm_cd` VARCHAR(10) NOT NULL,
    `mdoblig_fld_nm` VARCHAR(100) NULL,
    `career` TEXT NULL,
    `job` TEXT NULL,
    `summary` TEXT NULL,
    `trend` TEXT NULL,
    `hist` TEXT NULL,

    PRIMARY KEY (`jm_cd`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exam_schedule` (
    `jm_cd` VARCHAR(10) NOT NULL,
    `impl_yy` SMALLINT NOT NULL,
    `impl_seq` VARCHAR(10) NOT NULL,
    -- db.md §2: doc_reg_start_dt 파생 STORED 생성 컬럼. NULL 은 1000-01-01 로 채운다.
    `reg_key` DATE AS (COALESCE(`doc_reg_start_dt`, '1000-01-01')) STORED NOT NULL,
    `description` VARCHAR(255) NULL,
    `doc_reg_start_dt` DATE NULL,
    `doc_reg_end_dt` DATE NULL,
    `doc_exam_start_dt` DATE NULL,
    `doc_exam_end_dt` DATE NULL,
    `doc_pass_dt` DATE NULL,
    `prac_reg_start_dt` DATE NULL,
    `prac_reg_end_dt` DATE NULL,
    `prac_exam_start_dt` DATE NULL,
    `prac_exam_end_dt` DATE NULL,
    `prac_pass_dt` DATE NULL,

    PRIMARY KEY (`jm_cd`, `impl_yy`, `impl_seq`, `reg_key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `certificate_field` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `jm_cd` VARCHAR(10) NOT NULL,
    `field_id` INTEGER NOT NULL,

    UNIQUE INDEX `certificate_field_jm_cd_field_id_key`(`jm_cd`, `field_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recommendation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `generated_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `recommendation_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recommendation_item` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `recommendation_id` INTEGER NOT NULL,
    `jm_cd` VARCHAR(10) NOT NULL,
    `rank_no` INTEGER NOT NULL,
    `reason` TEXT NOT NULL,

    UNIQUE INDEX `recommendation_item_recommendation_id_rank_no_key`(`recommendation_id`, `rank_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `qual_detail` ADD CONSTRAINT `qual_detail_jm_cd_fkey` FOREIGN KEY (`jm_cd`) REFERENCES `certification`(`jm_cd`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_schedule` ADD CONSTRAINT `exam_schedule_jm_cd_fkey` FOREIGN KEY (`jm_cd`) REFERENCES `certification`(`jm_cd`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `certificate_field` ADD CONSTRAINT `certificate_field_jm_cd_fkey` FOREIGN KEY (`jm_cd`) REFERENCES `certification`(`jm_cd`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `certificate_field` ADD CONSTRAINT `certificate_field_field_id_fkey` FOREIGN KEY (`field_id`) REFERENCES `field`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recommendation` ADD CONSTRAINT `recommendation_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recommendation_item` ADD CONSTRAINT `recommendation_item_recommendation_id_fkey` FOREIGN KEY (`recommendation_id`) REFERENCES `recommendation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recommendation_item` ADD CONSTRAINT `recommendation_item_jm_cd_fkey` FOREIGN KEY (`jm_cd`) REFERENCES `certification`(`jm_cd`) ON DELETE CASCADE ON UPDATE CASCADE;
