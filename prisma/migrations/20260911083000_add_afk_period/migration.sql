-- CreateTable
CREATE TABLE "AfkPeriod" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "AfkPeriod_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AfkPeriod" ADD CONSTRAINT "AfkPeriod_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

