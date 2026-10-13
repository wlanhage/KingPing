-- AlterTable
ALTER TABLE "Duel" ADD COLUMN     "loserSets" INTEGER,
ADD COLUMN     "winEventId" TEXT,
ADD COLUMN     "winnerSets" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Duel_winEventId_key" ON "Duel"("winEventId");

-- AddForeignKey
ALTER TABLE "Duel" ADD CONSTRAINT "Duel_winEventId_fkey" FOREIGN KEY ("winEventId") REFERENCES "WinEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Rundor med exakt två spelare var 1 mot 1 som tog kronan. De blir dueller i efterhand, så att
-- 1 mot 1-spåret har hela historiken i en tabell.
INSERT INTO "Duel" ("id", "winnerId", "loserId", "winnerPoints", "loserPoints", "occurredAt", "winEventId")
SELECT 'kronmatch_' || "id", "standings"[1], "standings"[2], "finalWinnerPoints", "finalRunnerUpPoints", "occurredAt", "id"
FROM "WinEvent"
WHERE cardinality("standings") = 2
  AND NOT EXISTS (SELECT 1 FROM "Duel" d WHERE d."winEventId" = "WinEvent"."id");
