-- AlterTable
ALTER TABLE `EmailJob` ADD COLUMN `starred` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `passwordHash` VARCHAR(191) NULL,
    MODIFY `googleId` VARCHAR(191) NULL;
