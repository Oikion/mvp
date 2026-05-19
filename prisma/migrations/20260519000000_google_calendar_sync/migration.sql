-- Google Calendar two-way sync: new enum, connection table, and googleEventId field

-- CreateEnum
CREATE TYPE "GoogleSyncStatus" AS ENUM ('ACTIVE', 'NEEDS_REAUTH', 'PAUSED', 'DISCONNECTED');

-- AlterTable: add googleEventId to CalendarEvent for bidirectional lookup
ALTER TABLE "CalendarEvent" ADD COLUMN "googleEventId" TEXT;

-- CreateIndex: unique constraint so two events can't map to the same Google event
CREATE UNIQUE INDEX "CalendarEvent_googleEventId_key" ON "CalendarEvent"("googleEventId");

-- CreateTable: stores per-user Google OAuth tokens and watch channel state
CREATE TABLE "user_google_calendar_connections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "googleEmail" TEXT NOT NULL,
    "googleCalendarId" TEXT NOT NULL DEFAULT 'primary',
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "watchChannelId" TEXT,
    "watchExpiry" TIMESTAMP(3),
    "watchResourceId" TEXT,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "status" "GoogleSyncStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_google_calendar_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_google_calendar_connections_userId_key" ON "user_google_calendar_connections"("userId");

-- CreateIndex
CREATE INDEX "user_google_calendar_connections_organizationId_idx" ON "user_google_calendar_connections"("organizationId");

-- CreateIndex
CREATE INDEX "user_google_calendar_connections_watchChannelId_idx" ON "user_google_calendar_connections"("watchChannelId");

-- CreateIndex
CREATE INDEX "user_google_calendar_connections_status_idx" ON "user_google_calendar_connections"("status");

-- AddForeignKey
ALTER TABLE "user_google_calendar_connections" ADD CONSTRAINT "user_google_calendar_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
