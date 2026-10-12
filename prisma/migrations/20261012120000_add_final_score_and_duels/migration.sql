-- AlterTable
ALTER TABLE "WinEvent" ADD COLUMN     "finalRunnerUpPoints" INTEGER,
ADD COLUMN     "finalWinnerPoints" INTEGER;

-- CreateTable
CREATE TABLE "Duel" (
    "id" TEXT NOT NULL,
    "requestId" TEXT,
    "winnerId" TEXT NOT NULL,
    "loserId" TEXT NOT NULL,
    "winnerPoints" INTEGER,
    "loserPoints" INTEGER,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Duel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Duel_requestId_key" ON "Duel"("requestId");

-- AddForeignKey
ALTER TABLE "Duel" ADD CONSTRAINT "Duel_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Duel" ADD CONSTRAINT "Duel_loserId_fkey" FOREIGN KEY ("loserId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

