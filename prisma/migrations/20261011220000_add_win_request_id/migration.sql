ALTER TABLE "WinEvent" ADD COLUMN "requestId" TEXT;
CREATE UNIQUE INDEX "WinEvent_requestId_key" ON "WinEvent"("requestId");
