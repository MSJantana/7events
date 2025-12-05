/*
  Warnings:

  - You are about to drop the `UserLocal` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `UserLocal` DROP FOREIGN KEY `UserLocal_userId_fkey`;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `passwordHash` VARCHAR(191) NULL;

-- DropTable
DROP TABLE `UserLocal`;
