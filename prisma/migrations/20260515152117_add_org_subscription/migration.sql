-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'PRO', 'BUSINESS');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('INACTIVE', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateTable
CREATE TABLE "OrgSubscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT,
    "stripeBaseItemId" TEXT,
    "stripeSeatItemId" TEXT,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "billingCycle" "BillingCycle",
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'INACTIVE',
    "seatAllowance" INTEGER NOT NULL DEFAULT 0,
    "overageSeats" INTEGER NOT NULL DEFAULT 0,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrgSubscription_organizationId_key" ON "OrgSubscription"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrgSubscription_stripeCustomerId_key" ON "OrgSubscription"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "OrgSubscription_stripeSubscriptionId_key" ON "OrgSubscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "OrgSubscription_organizationId_idx" ON "OrgSubscription"("organizationId");

-- CreateIndex
CREATE INDEX "OrgSubscription_stripeCustomerId_idx" ON "OrgSubscription"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "OrgSubscription_stripeSubscriptionId_idx" ON "OrgSubscription"("stripeSubscriptionId");
