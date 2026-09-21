-- user_profile 은 user 와 1:1 이고 실질 컬럼이 nickname 하나뿐이라 user 로 흡수한다.
-- NOT NULL 을 바로 붙이면 기존 행에서 실패하므로 nullable 로 추가 → 백필 → NOT NULL 순으로 간다.
ALTER TABLE `user` ADD COLUMN `nickname` VARCHAR(10) NULL;

UPDATE `user` u JOIN `user_profile` p ON p.`user_id` = u.`id` SET u.`nickname` = p.`nickname`;

-- 프로필 행이 없던 사용자(가입 실패 잔여 등)를 위한 안전망
UPDATE `user` SET `nickname` = '' WHERE `nickname` IS NULL;

ALTER TABLE `user` MODIFY COLUMN `nickname` VARCHAR(10) NOT NULL;

DROP TABLE `user_profile`;
