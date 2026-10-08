-- DropForeignKey
ALTER TABLE `certificate_field` DROP FOREIGN KEY `certificate_field_jm_cd_fkey`;

-- DropForeignKey
ALTER TABLE `certificate_field` DROP FOREIGN KEY `certificate_field_field_id_fkey`;

-- DropTable
DROP TABLE `certificate_field`;
