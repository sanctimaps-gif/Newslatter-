-- CreateEnum
CREATE TYPE "SubscriberStatus" AS ENUM ('pending', 'active', 'unsubscribed', 'blocked');

-- CreateEnum
CREATE TYPE "NewsletterStatus" AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'failed');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('sending', 'sent', 'failed');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('info', 'warn', 'error');

-- CreateTable
CREATE TABLE "Subscriber" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "status" "SubscriberStatus" NOT NULL DEFAULT 'pending',
    "unsubscribeToken" TEXT NOT NULL,
    "confirmTokenHash" TEXT,
    "confirmTokenExpiry" TIMESTAMP(3),
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentEvent" (
    "id" UUID NOT NULL,
    "subscriberId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "consentText" TEXT,
    "source" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Newsletter" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "status" "NewsletterStatus" NOT NULL DEFAULT 'draft',
    "trigger" TEXT NOT NULL DEFAULT 'auto',
    "subject" TEXT,
    "html" TEXT,
    "text" TEXT,
    "saints" JSONB,
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3),
    "lockedUntil" TIMESTAMP(3),
    "lastError" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Newsletter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" UUID NOT NULL,
    "newsletterId" UUID NOT NULL,
    "subscriberId" UUID NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'sending',
    "messageId" TEXT,
    "error" TEXT,
    "retryable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogEntry" (
    "id" UUID NOT NULL,
    "newsletterId" UUID,
    "level" "LogLevel" NOT NULL DEFAULT 'info',
    "message" TEXT NOT NULL,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "autoSendEnabled" BOOLEAN NOT NULL DEFAULT false,
    "sendTime" TEXT NOT NULL DEFAULT '07:00',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "frequency" TEXT NOT NULL DEFAULT 'daily',
    "fromEmail" TEXT,
    "fromName" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_email_key" ON "Subscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_unsubscribeToken_key" ON "Subscriber"("unsubscribeToken");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_confirmTokenHash_key" ON "Subscriber"("confirmTokenHash");

-- CreateIndex
CREATE INDEX "Subscriber_status_id_idx" ON "Subscriber"("status", "id");

-- CreateIndex
CREATE INDEX "ConsentEvent_subscriberId_idx" ON "ConsentEvent"("subscriberId");

-- CreateIndex
CREATE UNIQUE INDEX "Newsletter_key_key" ON "Newsletter"("key");

-- CreateIndex
CREATE INDEX "Newsletter_status_idx" ON "Newsletter"("status");

-- CreateIndex
CREATE INDEX "Newsletter_date_idx" ON "Newsletter"("date");

-- CreateIndex
CREATE INDEX "Delivery_newsletterId_status_idx" ON "Delivery"("newsletterId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_newsletterId_subscriberId_key" ON "Delivery"("newsletterId", "subscriberId");

-- CreateIndex
CREATE INDEX "LogEntry_createdAt_idx" ON "LogEntry"("createdAt");

-- CreateIndex
CREATE INDEX "LogEntry_newsletterId_idx" ON "LogEntry"("newsletterId");

-- AddForeignKey
ALTER TABLE "ConsentEvent" ADD CONSTRAINT "ConsentEvent_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_newsletterId_fkey" FOREIGN KEY ("newsletterId") REFERENCES "Newsletter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogEntry" ADD CONSTRAINT "LogEntry_newsletterId_fkey" FOREIGN KEY ("newsletterId") REFERENCES "Newsletter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
