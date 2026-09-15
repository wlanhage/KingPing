-- AlterTable
ALTER TABLE "WinEvent" ADD COLUMN     "standings" TEXT[] DEFAULT ARRAY[]::TEXT[];
