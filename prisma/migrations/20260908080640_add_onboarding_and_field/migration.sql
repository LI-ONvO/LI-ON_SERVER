-- CreateTable
CREATE TABLE `field` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(30) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_desired_field` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `field_id` INTEGER NOT NULL,

    UNIQUE INDEX `user_desired_field_user_id_field_id_key`(`user_id`, `field_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `onboarding_question` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `question_key` VARCHAR(50) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `min_select` INTEGER NOT NULL DEFAULT 1,
    `max_select` INTEGER NULL,
    `order_no` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `onboarding_question_question_key_key`(`question_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `onboarding_option` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `question_id` INTEGER NOT NULL,
    `field_id` INTEGER NULL,
    `option_key` VARCHAR(50) NOT NULL,
    `value` VARCHAR(50) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `order_no` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `onboarding_option_question_id_option_key_key`(`question_id`, `option_key`),
    UNIQUE INDEX `onboarding_option_question_id_value_key`(`question_id`, `value`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `onboarding_answer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `question_id` INTEGER NOT NULL,
    `option_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `onboarding_answer_user_id_option_id_key`(`user_id`, `option_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_desired_field` ADD CONSTRAINT `user_desired_field_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_desired_field` ADD CONSTRAINT `user_desired_field_field_id_fkey` FOREIGN KEY (`field_id`) REFERENCES `field`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `onboarding_option` ADD CONSTRAINT `onboarding_option_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `onboarding_question`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `onboarding_option` ADD CONSTRAINT `onboarding_option_field_id_fkey` FOREIGN KEY (`field_id`) REFERENCES `field`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `onboarding_answer` ADD CONSTRAINT `onboarding_answer_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `onboarding_answer` ADD CONSTRAINT `onboarding_answer_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `onboarding_question`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `onboarding_answer` ADD CONSTRAINT `onboarding_answer_option_id_fkey` FOREIGN KEY (`option_id`) REFERENCES `onboarding_option`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed: FIELD / ONBOARDING_QUESTION / ONBOARDING_OPTION 는 마스터 데이터라 마이그레이션으로 배포한다.
INSERT INTO `field` (`id`, `name`) VALUES
    (1, '백엔드 개발'),
    (2, '프론트엔드 개발'),
    (3, '모바일 앱 개발'),
    (4, '인공지능·데이터'),
    (5, '정보보안'),
    (6, '클라우드·인프라'),
    (7, '임베디드·IoT'),
    (8, '게임 개발'),
    (9, 'UI/UX 디자인'),
    (10, '네트워크');

INSERT INTO `onboarding_question`
    (`id`, `question_key`, `title`, `min_select`, `max_select`, `order_no`, `is_active`, `updated_at`) VALUES
    (1, 'desired_field', '관심 있는 분야를 선택해 주세요.', 1, 3, 1, true, CURRENT_TIMESTAMP(3)),
    (2, 'study_time', '하루에 학습할 수 있는 시간은 얼마나 되나요?', 1, 1, 2, true, CURRENT_TIMESTAMP(3)),
    (3, 'target_period', '목표 취득 시기는 언제인가요?', 1, 1, 3, true, CURRENT_TIMESTAMP(3)),
    (4, 'exam_experience', '자격증 응시 경험이 있나요?', 1, 1, 4, true, CURRENT_TIMESTAMP(3));

-- 희망 분야 문항의 value 는 ERD 규칙대로 field_id 문자열이다.
INSERT INTO `onboarding_option`
    (`question_id`, `field_id`, `option_key`, `value`, `label`, `order_no`, `is_active`) VALUES
    (1, 1, 'backend', '1', '백엔드 개발', 1, true),
    (1, 2, 'frontend', '2', '프론트엔드 개발', 2, true),
    (1, 3, 'mobile', '3', '모바일 앱 개발', 3, true),
    (1, 4, 'ai_data', '4', '인공지능·데이터', 4, true),
    (1, 5, 'security', '5', '정보보안', 5, true),
    (1, 6, 'cloud', '6', '클라우드·인프라', 6, true),
    (1, 7, 'embedded', '7', '임베디드·IoT', 7, true),
    (1, 8, 'game', '8', '게임 개발', 8, true),
    (1, 9, 'design', '9', 'UI/UX 디자인', 9, true),
    (1, 10, 'network', '10', '네트워크', 10, true),
    (2, NULL, 'under_1h', 'under_1h', '1시간 미만', 1, true),
    (2, NULL, '1_to_2h', '1_to_2h', '1~2시간', 2, true),
    (2, NULL, '2_to_4h', '2_to_4h', '2~4시간', 3, true),
    (2, NULL, 'over_4h', 'over_4h', '4시간 이상', 4, true),
    (3, NULL, 'within_3m', 'within_3m', '3개월 이내', 1, true),
    (3, NULL, 'within_6m', 'within_6m', '6개월 이내', 2, true),
    (3, NULL, 'within_1y', 'within_1y', '1년 이내', 3, true),
    (3, NULL, 'undecided', 'undecided', '아직 정하지 않음', 4, true),
    (4, NULL, 'none', 'none', '없음', 1, true),
    (4, NULL, 'attempted', 'attempted', '응시해 본 적 있음', 2, true),
    (4, NULL, 'acquired', 'acquired', '취득한 자격증이 있음', 3, true);
