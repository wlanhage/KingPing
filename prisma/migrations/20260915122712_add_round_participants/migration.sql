-- AlterTable
ALTER TABLE "WinEvent" ADD COLUMN     "participantIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "runnerUpId" TEXT;
