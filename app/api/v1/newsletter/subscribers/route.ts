import { NextRequest } from "next/server";
import { prismadb } from "@/lib/prisma";
import { API_SCOPES } from "@/lib/api-auth";
import {
  withExternalApi,
  createApiSuccessResponse,
  createApiErrorResponse,
  parsePaginationParams,
  parseFilterParams,
  ExternalApiContext,
} from "@/lib/external-api-middleware";
import {
  encryptNewsletterSubscriberForOrg,
  decryptNewsletterSubscriberForOrg,
} from "@/lib/model-encryption";

/**
 * GET /api/v1/newsletter/subscribers
 * List newsletter subscribers
 */
export const GET = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const { cursor, limit } = parsePaginationParams(req);
    const filters = parseFilterParams(req, ["status", "tag", "source", "search"]);

    // Build where clause
    const where: Record<string, unknown> = {
      organizationId: context.organizationId,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.tag) {
      where.tags = { has: filters.tag };
    }

    if (filters.source) {
      where.source = filters.source;
    }

    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: "insensitive" } },
        { firstName: { contains: filters.search, mode: "insensitive" } },
        { lastName: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const subscribers = await prismadb.newsletterSubscriber.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { subscribedAt: "desc" },
    });

    const hasMore = subscribers.length > limit;
    const items = hasMore ? subscribers.slice(0, -1) : subscribers;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    // Get total count for stats
    const totalCount = await prismadb.newsletterSubscriber.count({
      where: { organizationId: context.organizationId },
    });

    const activeCount = await prismadb.newsletterSubscriber.count({
      where: { organizationId: context.organizationId, status: "ACTIVE" },
    });

    // Decrypt PII fields before returning
    const decryptedItems = await Promise.all(
      items.map((sub) => decryptNewsletterSubscriberForOrg(sub, context.organizationId))
    );

    return createApiSuccessResponse(
      {
        subscribers: decryptedItems.map((sub) => ({
          id: sub.id,
          email: sub.email,
          firstName: sub.firstName,
          lastName: sub.lastName,
          status: sub.status,
          source: sub.source,
          tags: sub.tags,
          stats: {
            emailsSent: sub.emailsSentCount,
            emailsOpened: sub.emailsOpenedCount,
            emailsClicked: sub.emailsClickedCount,
          },
          subscribedAt: sub.subscribedAt.toISOString(),
          unsubscribedAt: sub.unsubscribedAt?.toISOString(),
          lastEmailSentAt: sub.lastEmailSentAt?.toISOString(),
        })),
        stats: {
          total: totalCount,
          active: activeCount,
        },
      },
      200,
      { nextCursor, hasMore, limit }
    );
  },
  { requiredScopes: [API_SCOPES.NEWSLETTER_READ] }
);

/**
 * POST /api/v1/newsletter/subscribers
 * Add a new subscriber
 */
export const POST = withExternalApi(
  async (req: NextRequest, context: ExternalApiContext) => {
    const body = await req.json();

    const { email, firstName, lastName, tags, source, metadata } = body;

    // Validate email
    if (!email) {
      return createApiErrorResponse("Missing required field: email", 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return createApiErrorResponse("Invalid email format", 400);
    }

    // Check if subscriber already exists
    const existingSubscriber = await prismadb.newsletterSubscriber.findUnique({
      where: {
        organizationId_email: {
          organizationId: context.organizationId,
          email: email.toLowerCase(),
        },
      },
    });

    if (existingSubscriber) {
      // If they're unsubscribed, resubscribe them
      if (existingSubscriber.status === "UNSUBSCRIBED") {
        const resubData = await encryptNewsletterSubscriberForOrg(
          {
            firstName: firstName || existingSubscriber.firstName,
            lastName: lastName || existingSubscriber.lastName,
          },
          context.organizationId
        );

        const subscriber = await prismadb.newsletterSubscriber.update({
          where: { id: existingSubscriber.id },
          data: {
            status: "ACTIVE",
            unsubscribedAt: null,
            ...resubData,
            tags: tags ? Array.from(new Set([...existingSubscriber.tags, ...tags])) : existingSubscriber.tags,
            metadata: metadata || existingSubscriber.metadata,
          },
        });

        const decryptedSub = await decryptNewsletterSubscriberForOrg(subscriber, context.organizationId);
        return createApiSuccessResponse(
          {
            subscriber: {
              id: decryptedSub.id,
              email: decryptedSub.email,
              status: decryptedSub.status,
              resubscribed: true,
            },
          },
          200
        );
      }

      return createApiErrorResponse("Subscriber already exists", 409);
    }

    // Encrypt PII fields before storing
    const encryptedData = await encryptNewsletterSubscriberForOrg(
      {
        email: email.toLowerCase(),
        firstName: firstName || null,
        lastName: lastName || null,
      },
      context.organizationId
    );

    // Create new subscriber
    const subscriber = await prismadb.newsletterSubscriber.create({
      data: {
        organizationId: context.organizationId,
        ...encryptedData,
        status: "ACTIVE",
        source: source || "api",
        tags: tags || [],
        metadata: metadata || null,
      },
    });

    const decryptedNew = await decryptNewsletterSubscriberForOrg(subscriber, context.organizationId);
    return createApiSuccessResponse(
      {
        subscriber: {
          id: decryptedNew.id,
          email: decryptedNew.email,
          firstName: decryptedNew.firstName,
          lastName: decryptedNew.lastName,
          status: decryptedNew.status,
          subscribedAt: decryptedNew.subscribedAt.toISOString(),
        },
      },
      201
    );
  },
  { requiredScopes: [API_SCOPES.NEWSLETTER_WRITE] }
);
