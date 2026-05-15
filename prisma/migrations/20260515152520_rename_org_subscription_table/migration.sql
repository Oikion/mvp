/*
  Warnings:

  - You are about to drop the `OrgSubscription` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "OrgSubscription";

-- CreateTable
CREATE TABLE "org_subscriptions" (
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

    CONSTRAINT "org_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "org_subscriptions_organizationId_key" ON "org_subscriptions"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "org_subscriptions_stripeCustomerId_key" ON "org_subscriptions"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "org_subscriptions_stripeSubscriptionId_key" ON "org_subscriptions"("stripeSubscriptionId");
