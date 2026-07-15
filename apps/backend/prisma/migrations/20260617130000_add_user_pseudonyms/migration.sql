-- AlterTable
ALTER TABLE "User" ADD COLUMN "pseudonyms" TEXT[] NOT NULL DEFAULT '{}';
