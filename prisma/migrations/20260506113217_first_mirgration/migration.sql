-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('NEW_KING', 'SAME_KING_STREAK_2', 'SAME_KING_STREAK_3', 'SAME_KING_STREAK_4', 'SAME_KING_STREAK_5_PLUS', 'STREAK_BREAK_SMALL', 'STREAK_BREAK_MEDIUM', 'STREAK_BREAK_MAJOR', 'STREAK_BREAK_LEGENDARY', 'FIRST_WIN', 'COMEBACK', 'FRIDAY_FINAL', 'RECORD_BROKEN');

-- CreateEnum
CREATE TYPE "NationState" AS ENUM ('STABLE_ERA', 'TENSION', 'INSTABILITY', 'DYNASTY', 'TYRANNY', 'REVOLUTION');

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slackUserId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reign" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "startEventId" TEXT,

    CONSTRAINT "Reign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WinEvent" (
    "id" TEXT NOT NULL,
    "winnerId" TEXT NOT NULL,
    "previousKingId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventType" "EventType" NOT NULL,
    "streakCount" INTEGER NOT NULL,
    "previousStreakCount" INTEGER,
    "note" TEXT,
    "announcementText" TEXT NOT NULL,
    "nationState" "NationState" NOT NULL,
    "isFridayFinal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WinEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "winEventId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "layout" TEXT NOT NULL,
    "persona" TEXT NOT NULL,
    "postedToSlack" BOOLEAN NOT NULL DEFAULT false,
    "slackTs" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_name_key" ON "Player"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Announcement_winEventId_key" ON "Announcement"("winEventId");

-- AddForeignKey
ALTER TABLE "Reign" ADD CONSTRAINT "Reign_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WinEvent" ADD CONSTRAINT "WinEvent_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_winEventId_fkey" FOREIGN KEY ("winEventId") REFERENCES "WinEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
