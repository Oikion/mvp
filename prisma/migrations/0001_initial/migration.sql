-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('NEW', 'READ', 'CONTACTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MarketingCategory" AS ENUM ('LEAD_GENERATION', 'ADVERTISING', 'SOCIAL_MEDIA', 'PRINT_MEDIA', 'SIGNAGE', 'OPEN_HOUSE', 'NETWORKING', 'REFERRAL_PROGRAM', 'WEBSITE', 'SEO', 'EMAIL_MARKETING', 'OTHER');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('ADMINISTRATIVE', 'INCOME_PRODUCING', 'SHOWINGS', 'PROSPECTING', 'MARKETING', 'TRAINING', 'TRAVEL', 'CLIENT_MEETINGS', 'NEGOTIATIONS', 'PAPERWORK', 'OTHER');

-- CreateEnum
CREATE TYPE "ShowingResult" AS ENUM ('NO_SHOW', 'NO_INTEREST', 'INTERESTED', 'VERY_INTERESTED', 'OFFER_MADE', 'CONTRACT_SIGNED');

-- CreateEnum
CREATE TYPE "DealType" AS ENUM ('SELLER', 'BUYER', 'DUAL');

-- CreateEnum
CREATE TYPE "ActiveStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING');

-- CreateEnum
CREATE TYPE "AddressPrivacyLevel" AS ENUM ('EXACT', 'PARTIAL', 'HIDDEN');

-- CreateEnum
CREATE TYPE "CalendarEventType" AS ENUM ('PROPERTY_VIEWING', 'CLIENT_CONSULTATION', 'MEETING', 'REMINDER', 'TASK_DEADLINE', 'OTHER');

-- CreateEnum
CREATE TYPE "ClientContactType" AS ENUM ('PRIMARY', 'SECONDARY', 'EMERGENCY', 'REFERRAL');

-- CreateEnum
CREATE TYPE "ClientIntent" AS ENUM ('BUY', 'RENT', 'SELL', 'LEASE', 'INVEST');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('LEAD', 'ACTIVE', 'INACTIVE', 'CONVERTED', 'LOST');

-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('BUYER', 'SELLER', 'RENTER', 'INVESTOR', 'REFERRAL_PARTNER');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('PROPOSED', 'NEGOTIATING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DocumentSystemType" AS ENUM ('INVOICE', 'RECEIPT', 'CONTRACT', 'OFFER', 'OTHER');

-- CreateEnum
CREATE TYPE "EnergyCertClass" AS ENUM ('A_PLUS', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'IN_PROGRESS');

-- CreateEnum
CREATE TYPE "FinancingType" AS ENUM ('CASH', 'MORTGAGE', 'PREAPPROVAL_PENDING');

-- CreateEnum
CREATE TYPE "FrontageType" AS ENUM ('MAIN_ROAD', 'SECONDARY_ROAD', 'PEDESTRIAN', 'CORNER', 'SQUARE', 'CUL_DE_SAC', 'NONE');

-- CreateEnum
CREATE TYPE "FurnishedStatus" AS ENUM ('NO', 'PARTIALLY', 'FULLY');

-- CreateEnum
CREATE TYPE "HeatingType" AS ENUM ('AUTONOMOUS', 'CENTRAL', 'NATURAL_GAS', 'HEAT_PUMP', 'ELECTRIC', 'NONE');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'TENTATIVE');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('cz', 'en', 'de', 'uk', 'el');

-- CreateEnum
CREATE TYPE "LayoutPreference" AS ENUM ('DEFAULT', 'WIDE');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('REFERRAL', 'WEB', 'PORTAL', 'WALK_IN', 'SOCIAL');

-- CreateEnum
CREATE TYPE "LegalizationStatus" AS ENUM ('LEGALIZED', 'IN_PROGRESS', 'UNDECLARED');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('ACCOUNT_UPDATED', 'ACCOUNT_DELETED', 'ACCOUNT_TASK_CREATED', 'ACCOUNT_TASK_UPDATED', 'CALENDAR_REMINDER', 'CALENDAR_EVENT_CREATED', 'CALENDAR_EVENT_UPDATED', 'CALENDAR_EVENT_CANCELLED', 'PROPERTY_UPDATED', 'PROPERTY_DELETED', 'DOCUMENT_SHARED', 'SYSTEM', 'CLIENT_CREATED', 'CLIENT_ASSIGNED', 'PROPERTY_CREATED', 'PROPERTY_ASSIGNED', 'CALENDAR_EVENT_INVITED', 'DOCUMENT_VIEWED', 'SOCIAL_POST_LIKED', 'SOCIAL_POST_COMMENTED', 'SOCIAL_POST_MENTIONED', 'ENTITY_SHARED_WITH_YOU', 'ENTITY_SHARE_ACCEPTED', 'CONNECTION_REQUEST', 'CONNECTION_ACCEPTED', 'DEAL_PROPOSED', 'DEAL_UPDATED', 'DEAL_ACCEPTED', 'DEAL_COMPLETED', 'TASK_ASSIGNED', 'TASK_COMMENT_ADDED', 'TASK_DUE_SOON', 'WELCOME', 'ACCOUNT_WARNING', 'ACCOUNT_SUSPENSION', 'ACCOUNT_UNSUSPENSION', 'ACCOUNT_DELETION_NOTICE', 'FEEDBACK_RESPONSE', 'MESSAGE_RECEIVED', 'MESSAGE_MENTION', 'CHANNEL_INVITE', 'CHANNEL_MESSAGE', 'CONTACT_FORM_SUBMISSION', 'ORGANIZATION_INVITE');

-- CreateEnum
CREATE TYPE "NotificationEntityType" AS ENUM ('ACCOUNT', 'PROPERTY', 'CALENDAR_EVENT', 'TASK', 'DOCUMENT', 'SOCIAL_POST', 'DEAL', 'CONNECTION', 'USER', 'FEEDBACK', 'CONVERSATION', 'ORGANIZATION', 'CHANNEL', 'CONTACT_SUBMISSION');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EMAIL', 'IN_APP');

-- CreateEnum
CREATE TYPE "PersonType" AS ENUM ('INDIVIDUAL', 'COMPANY', 'INVESTOR', 'BROKER');

-- CreateEnum
CREATE TYPE "PortalVisibility" AS ENUM ('PRIVATE', 'SELECTED', 'PUBLIC');

-- CreateEnum
CREATE TYPE "PriceType" AS ENUM ('RENTAL', 'SALE', 'PER_ACRE', 'PER_SQM');

-- CreateEnum
CREATE TYPE "ProfileVisibility" AS ENUM ('PERSONAL', 'SECURE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "PropertyCondition" AS ENUM ('EXCELLENT', 'VERY_GOOD', 'GOOD', 'NEEDS_RENOVATION');

-- CreateEnum
CREATE TYPE "PropertyPurpose" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'LAND', 'PARKING', 'OTHER');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('ACTIVE', 'PENDING', 'SOLD', 'OFF_MARKET', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'LAND', 'RENTAL', 'VACATION', 'APARTMENT', 'HOUSE', 'MAISONETTE', 'WAREHOUSE', 'PARKING', 'PLOT', 'FARM', 'INDUSTRIAL', 'OTHER');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SharePermission" AS ENUM ('VIEW_ONLY', 'VIEW_COMMENT');

-- CreateEnum
CREATE TYPE "SharedEntityType" AS ENUM ('PROPERTY', 'CLIENT', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "TemplateType" AS ENUM ('BROKERAGE_MANDATE', 'LEASE_AGREEMENT', 'HANDOVER_PROTOCOL', 'VIEWING_CONFIRMATION');

-- CreateEnum
CREATE TYPE "Timeline" AS ENUM ('IMMEDIATE', 'ONE_THREE_MONTHS', 'THREE_SIX_MONTHS', 'SIX_PLUS_MONTHS');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('SALE', 'RENTAL', 'SHORT_TERM', 'EXCHANGE');

-- CreateEnum
CREATE TYPE "MandateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'FULFILLED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MandateUrgency" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "BlogPostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SubscriberStatus" AS ENUM ('ACTIVE', 'UNSUBSCRIBED', 'BOUNCED', 'COMPLAINED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('LINKEDIN', 'INSTAGRAM', 'TIKTOK', 'TWITTER', 'FACEBOOK', 'YOUTUBE');

-- CreateEnum
CREATE TYPE "SocialPostStatus" AS ENUM ('PENDING', 'SCHEDULED', 'POSTING', 'POSTED', 'FAILED', 'DELETED');

-- CreateEnum
CREATE TYPE "ChangelogStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReservedNameType" AS ENUM ('USERNAME', 'ORG_NAME', 'ORG_SLUG');

-- CreateEnum
CREATE TYPE "ReservedNameStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'CONVERTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReferralApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'LEAD', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "ExportEntityType" AS ENUM ('PROPERTY', 'CLIENT', 'CALENDAR', 'REPORT', 'BULK_PROPERTIES', 'BULK_CLIENTS');

-- CreateEnum
CREATE TYPE "ChannelMemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('PUBLIC', 'PRIVATE', 'ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "ConversationEntityType" AS ENUM ('CLIENT', 'PROPERTY', 'DEAL', 'PROJECT');

-- CreateEnum
CREATE TYPE "ConversationScope" AS ENUM ('ORG', 'PERSONAL', 'SHARED');

-- CreateEnum
CREATE TYPE "MessageContentType" AS ENUM ('TEXT', 'SYSTEM', 'FILE');

-- CreateEnum
CREATE TYPE "PresenceStatus" AS ENUM ('ONLINE', 'AWAY', 'BUSY', 'OFFLINE');

-- CreateEnum
CREATE TYPE "XePublicationType" AS ENUM ('BASIC', 'GOLD');

-- CreateEnum
CREATE TYPE "XeSyncPolicy" AS ENUM ('RENEW_ALL_STOCK', 'INCREMENTAL');

-- CreateEnum
CREATE TYPE "XeSyncRequestType" AS ENUM ('ADD_ITEMS', 'REMOVE_ITEMS');

-- CreateEnum
CREATE TYPE "XeSyncStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "XeSyncItemStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "BackgroundJobType" AS ENUM ('NEWSLETTER_SEND', 'PORTAL_PUBLISH_XE', 'BULK_EXPORT');

-- CreateEnum
CREATE TYPE "BackgroundJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

-- CreateEnum
CREATE TYPE "DataExportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "AgentConnection" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "bio" TEXT,
    "publicPhone" TEXT,
    "publicEmail" TEXT,
    "specializations" TEXT[],
    "serviceAreas" TEXT[],
    "languages" TEXT[],
    "yearsExperience" INTEGER,
    "certifications" TEXT[],
    "socialLinks" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "visibility" "ProfileVisibility" NOT NULL DEFAULT 'PERSONAL',
    "hideFromAgentSearch" BOOLEAN NOT NULL DEFAULT false,
    "contactFormEnabled" BOOLEAN NOT NULL DEFAULT false,
    "contactFormFields" JSONB,

    CONSTRAINT "AgentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentContactSubmission" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "formData" JSONB NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "senderName" TEXT,
    "senderEmail" TEXT,

    CONSTRAINT "AgentContactSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "friendlyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "calendarEventId" INTEGER NOT NULL,
    "calendarUserId" INTEGER NOT NULL DEFAULT 0,
    "organizationId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    "title" TEXT,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "status" TEXT,
    "attendeeEmail" TEXT,
    "attendeeName" TEXT,
    "notes" TEXT,
    "assignedUserId" TEXT,
    "documentIds" TEXT[],
    "recurrenceRule" TEXT,
    "reminderMinutes" INTEGER[],
    "remindersSent" JSONB,
    "eventType" "CalendarEventType",

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarReminder" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "eventId" TEXT NOT NULL,
    "reminderMinutes" INTEGER NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "notificationType" "NotificationType" NOT NULL DEFAULT 'EMAIL',
    "organizationId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',

    CONSTRAINT "CalendarReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientComment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "ClientComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client_Contacts" (
    "id" TEXT NOT NULL,
    "client" TEXT,
    "assigned_to" TEXT,
    "birthday" TEXT,
    "created_by" TEXT,
    "createdBy" TEXT,
    "created_on" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "cratedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "last_activity" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "last_activity_by" TEXT,
    "description" TEXT,
    "email" TEXT,
    "personal_email" TEXT,
    "contact_first_name" TEXT,
    "contact_last_name" TEXT NOT NULL,
    "office_phone" TEXT,
    "mobile_phone" TEXT,
    "website" TEXT,
    "position" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "contact_type" "ClientContactType",
    "relationship_to_client" TEXT,
    "type" TEXT DEFAULT 'Customer',
    "tags" TEXT[],
    "notes" TEXT[],
    "clientsIDs" TEXT,
    "documentsIDs" TEXT[],
    "organizationId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',

    CONSTRAINT "Client_Contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client_Properties" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,

    CONSTRAINT "Client_Properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clients" (
    "id" TEXT NOT NULL,
    "friendlyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "assigned_to" TEXT,
    "client_name" TEXT NOT NULL,
    "primary_email" TEXT,
    "client_type" "ClientType",
    "client_status" "ClientStatus" DEFAULT 'LEAD',
    "property_preferences" JSONB,
    "communication_notes" JSONB,
    "billing_city" TEXT,
    "billing_country" TEXT,
    "billing_postal_code" TEXT,
    "billing_state" TEXT,
    "billing_street" TEXT,
    "company_id" TEXT,
    "description" TEXT,
    "fax" TEXT,
    "member_of" TEXT,
    "office_phone" TEXT,
    "shipping_city" TEXT,
    "shipping_country" TEXT,
    "shipping_postal_code" TEXT,
    "shipping_state" TEXT,
    "shipping_street" TEXT,
    "vat" TEXT,
    "website" TEXT,
    "documentsIDs" TEXT[],
    "watchers" TEXT[],
    "organizationId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    "afm" TEXT,
    "allow_marketing" BOOLEAN DEFAULT false,
    "areas_of_interest" JSONB,
    "budget_max" DECIMAL(65,30),
    "budget_min" DECIMAL(65,30),
    "channels" TEXT[],
    "company_gemi" TEXT,
    "company_name" TEXT,
    "doy" TEXT,
    "draft_status" BOOLEAN DEFAULT false,
    "financing_type" "FinancingType",
    "full_name" TEXT,
    "gdpr_consent" BOOLEAN DEFAULT false,
    "id_doc" TEXT,
    "intent" "ClientIntent",
    "language" "Language" DEFAULT 'en',
    "lead_source" "LeadSource",
    "needs_mortgage_help" BOOLEAN DEFAULT false,
    "person_type" "PersonType",
    "preapproval_bank" TEXT,
    "primary_phone" TEXT,
    "purpose" "PropertyPurpose",
    "secondary_email" TEXT,
    "secondary_phone" TEXT,
    "timeline" "Timeline",

    CONSTRAINT "Clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "friendlyId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "propertyAgentId" TEXT NOT NULL,
    "clientAgentId" TEXT NOT NULL,
    "propertyAgentSplit" DECIMAL(65,30) NOT NULL DEFAULT 50,
    "clientAgentSplit" DECIMAL(65,30) NOT NULL DEFAULT 50,
    "totalCommission" DECIMAL(65,30),
    "commissionCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "DealStatus" NOT NULL DEFAULT 'PROPOSED',
    "proposedById" TEXT NOT NULL,
    "title" TEXT,
    "notes" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "contractDate" TIMESTAMP(3),
    "hoursWorked" DECIMAL(65,30),
    "dealType" "DealType",
    "leadSource" "LeadSource",
    "marketingSpendId" TEXT,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameEl" TEXT NOT NULL,
    "description" TEXT,
    "descriptionEl" TEXT,
    "templateType" "TemplateType" NOT NULL,
    "placeholders" JSONB NOT NULL,
    "docxUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentView" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewerIp" TEXT,
    "viewerUserAgent" TEXT,
    "viewerUserId" TEXT,

    CONSTRAINT "DocumentView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documents" (
    "id" TEXT NOT NULL,
    "friendlyId" TEXT NOT NULL,
    "date_created" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "last_updated" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "document_name" TEXT NOT NULL,
    "created_by_user" TEXT,
    "createdBy" TEXT,
    "description" TEXT,
    "document_type" TEXT,
    "favourite" BOOLEAN,
    "document_file_mimeType" TEXT NOT NULL,
    "document_file_url" TEXT NOT NULL,
    "status" TEXT,
    "visibility" TEXT,
    "tags" JSONB,
    "key" TEXT,
    "size" INTEGER,
    "assigned_user" TEXT,
    "connected_documents" TEXT[],
    "contactsIDs" TEXT[],
    "crm_accounts_tasksIDs" TEXT[],
    "accountsIDs" TEXT[],
    "document_system_type" "DocumentSystemType" DEFAULT 'OTHER',
    "expiresAt" TIMESTAMP(3),
    "lastViewedAt" TIMESTAMP(3),
    "linkEnabled" BOOLEAN NOT NULL DEFAULT false,
    "linkedCalendarEventsIds" TEXT[],
    "linkedPropertiesIds" TEXT[],
    "linkedTasksIds" TEXT[],
    "mentions" JSONB,
    "passwordHash" TEXT,
    "passwordProtected" BOOLEAN NOT NULL DEFAULT false,
    "shareableLink" TEXT,
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "organizationId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',

    CONSTRAINT "Documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documents_Types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Documents_Types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employees" (
    "id" TEXT NOT NULL,
    "avatar" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT NOT NULL,
    "salary" INTEGER NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "Employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventInvitee" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',

    CONSTRAINT "EventInvitee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "userEmail" TEXT,
    "userName" TEXT,
    "organizationId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    "feedbackType" TEXT NOT NULL,
    "feedback" TEXT NOT NULL,
    "url" TEXT,
    "userAgent" TEXT,
    "browserName" TEXT,
    "browserVersion" TEXT,
    "osName" TEXT,
    "osVersion" TEXT,
    "screenResolution" TEXT,
    "hasScreenshot" BOOLEAN NOT NULL DEFAULT false,
    "hasConsoleLogs" BOOLEAN NOT NULL DEFAULT false,
    "consoleLogsCount" INTEGER DEFAULT 0,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" TIMESTAMP(3),
    "adminNotes" TEXT,
    "consoleLogs" JSONB,
    "consoleLogsUrl" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "screenshot" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "adminResponse" TEXT,
    "respondedAt" TIMESTAMP(3),
    "respondedBy" VARCHAR(255),

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackComment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "feedbackId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorType" TEXT NOT NULL,
    "authorName" TEXT,
    "content" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "attachmentName" TEXT,
    "attachmentSize" INTEGER,
    "attachmentType" TEXT,

    CONSTRAINT "FeedbackComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdSequence" (
    "id" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL DEFAULT '__global__',
    "lastValue" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageUpload" (
    "id" TEXT NOT NULL,

    CONSTRAINT "ImageUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MyAccount" (
    "id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "is_person" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT,
    "email_accountant" TEXT,
    "phone_prefix" TEXT,
    "phone" TEXT,
    "mobile_prefix" TEXT,
    "mobile" TEXT,
    "fax_prefix" TEXT,
    "fax" TEXT,
    "website" TEXT,
    "street" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "country" TEXT,
    "country_code" TEXT,
    "billing_street" TEXT,
    "billing_city" TEXT,
    "billing_state" TEXT,
    "billing_zip" TEXT,
    "billing_country" TEXT,
    "billing_country_code" TEXT,
    "currency" TEXT,
    "currency_symbol" TEXT,
    "VAT_number" TEXT NOT NULL,
    "TAX_number" TEXT,
    "bank_name" TEXT,
    "bank_account" TEXT,
    "bank_code" TEXT,
    "bank_IBAN" TEXT,
    "bank_SWIFT" TEXT,
    "organizationId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',

    CONSTRAINT "MyAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    "type" "NotificationCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "entityType" "NotificationEntityType",
    "entityId" TEXT,
    "metadata" JSONB,
    "actorId" TEXT,
    "actorName" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileShowcaseProperty" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileShowcaseProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Properties" (
    "id" TEXT NOT NULL,
    "friendlyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "assigned_to" TEXT,
    "property_name" TEXT NOT NULL,
    "primary_email" TEXT,
    "property_type" "PropertyType",
    "property_status" "PropertyStatus" DEFAULT 'ACTIVE',
    "property_preferences" JSONB,
    "communication_notes" JSONB,
    "address_street" TEXT,
    "address_city" TEXT,
    "address_state" TEXT,
    "address_zip" TEXT,
    "price" DECIMAL(65,30),
    "bedrooms" INTEGER,
    "bathrooms" DOUBLE PRECISION,
    "square_feet" DECIMAL(65,30),
    "lot_size" DOUBLE PRECISION,
    "year_built" INTEGER,
    "description" TEXT,
    "watchers" TEXT[],
    "organizationId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    "accepts_pets" BOOLEAN,
    "accessibility" TEXT,
    "address_privacy_level" "AddressPrivacyLevel",
    "amenities" JSONB,
    "area" TEXT,
    "available_from" TIMESTAMP(3),
    "build_coefficient" DECIMAL(65,30),
    "building_block_ot" TEXT,
    "building_permit_no" TEXT,
    "building_permit_year" INTEGER,
    "condition" "PropertyCondition",
    "coverage_ratio" DECIMAL(65,30),
    "draft_status" BOOLEAN DEFAULT false,
    "elevator" BOOLEAN,
    "energy_cert_class" "EnergyCertClass",
    "etaireia_diaxeirisis" TEXT,
    "floor" TEXT,
    "floors_total" INTEGER,
    "frontage_m" DECIMAL(65,30),
    "frontage_type" "FrontageType",
    "furnished" "FurnishedStatus",
    "heating_type" "HeatingType",
    "inside_city_plan" BOOLEAN,
    "is_exclusive" BOOLEAN DEFAULT false,
    "land_registry_kaek" TEXT,
    "land_registry_office" TEXT,
    "legalization_status" "LegalizationStatus",
    "min_lease_months" INTEGER,
    "monthly_common_charges" DECIMAL(65,30),
    "municipality" TEXT,
    "objective_zone" TEXT,
    "orientation" JSONB,
    "plot_size_sqm" DECIMAL(65,30),
    "portal_visibility" "PortalVisibility",
    "postal_code" TEXT,
    "price_type" "PriceType",
    "region" TEXT,
    "regional_unit" TEXT,
    "renovated_year" INTEGER,
    "size_gross_sqm" DECIMAL(65,30),
    "size_net_sqm" DECIMAL(65,30),
    "transaction_type" "TransactionType",
    "listPrice" DECIMAL(65,30),
    "salePrice" DECIMAL(65,30),
    "saleDate" TIMESTAMP(3),
    "contractDate" TIMESTAMP(3),
    "daysOnMarket" INTEGER,
    "estimatedPrice" DECIMAL(65,30),
    "xePublished" BOOLEAN NOT NULL DEFAULT false,
    "xeRefId" TEXT,

    CONSTRAINT "Properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyComment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "propertyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "PropertyComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property_Contacts" (
    "id" TEXT NOT NULL,
    "property" TEXT,
    "assigned_to" TEXT,
    "created_on" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "description" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "contact_first_name" TEXT,
    "contact_last_name" TEXT NOT NULL,
    "contact_type" TEXT,

    CONSTRAINT "Property_Contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedEntity" (
    "id" TEXT NOT NULL,
    "entityType" "SharedEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "sharedById" TEXT NOT NULL,
    "sharedWithId" TEXT NOT NULL,
    "permissions" "SharePermission" NOT NULL DEFAULT 'VIEW_COMMENT',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPost" (
    "id" TEXT NOT NULL,
    "slug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "postType" TEXT NOT NULL,
    "content" TEXT,
    "linkedEntityId" TEXT,
    "linkedEntityType" TEXT,
    "linkedEntityTitle" TEXT,
    "linkedEntitySubtitle" TEXT,
    "linkedEntityMetadata" JSONB,

    CONSTRAINT "SocialPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPostComment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "SocialPostComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPostLike" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "SocialPostLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TodoList" (
    "id" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "user" TEXT NOT NULL,

    CONSTRAINT "TodoList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserNotificationSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "socialEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "socialInAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "crmEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "crmInAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "calendarEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "calendarInAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "tasksEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "tasksInAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "dealsEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "dealsInAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "documentsEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "documentsInAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "systemEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "systemInAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNotificationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Users" (
    "id" TEXT NOT NULL,
    "account_name" TEXT,
    "avatar" TEXT,
    "email" TEXT NOT NULL,
    "is_account_admin" BOOLEAN NOT NULL DEFAULT false,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "created_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),
    "name" TEXT,
    "password" TEXT,
    "username" TEXT,
    "userStatus" "ActiveStatus" NOT NULL DEFAULT 'PENDING',
    "userLanguage" "Language" NOT NULL DEFAULT 'en',
    "watching_accountsIDs" TEXT[],
    "watching_propertiesIDs" TEXT[],
    "clerkUserId" TEXT,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "analyticsConsent" BOOLEAN NOT NULL DEFAULT true,
    "consentTimestamp" TIMESTAMP(3),
    "gdprConsent" BOOLEAN NOT NULL DEFAULT false,
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "firstName" TEXT,
    "lastName" TEXT,
    "referralBoxDismissed" BOOLEAN NOT NULL DEFAULT false,
    "referralApplicationStatus" "ReferralApplicationStatus",
    "layoutPreference" "LayoutPreference" NOT NULL DEFAULT 'DEFAULT',
    "dashboardConfig" JSONB,
    "pinnedNavUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_Accounts_Tasks" (
    "id" TEXT NOT NULL,
    "friendlyId" TEXT NOT NULL,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "dueDateAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "priority" TEXT NOT NULL,
    "tags" JSONB,
    "title" TEXT NOT NULL,
    "likes" INTEGER DEFAULT 0,
    "user" TEXT,
    "account" TEXT,
    "calendarEventId" TEXT,
    "organizationId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',

    CONSTRAINT "crm_Accounts_Tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_Accounts_Tasks_Comments" (
    "id" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "crm_account_task" TEXT NOT NULL,
    "user" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',

    CONSTRAINT "crm_Accounts_Tasks_Comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modulStatus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isVisible" BOOLEAN NOT NULL,

    CONSTRAINT "modulStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "systemServices" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "serviceUrl" TEXT,
    "serviceId" TEXT,
    "serviceKey" TEXT,
    "servicePassword" TEXT,
    "servicePort" TEXT,
    "description" TEXT,

    CONSTRAINT "systemServices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_Modules_Enabled" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "system_Modules_Enabled_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingSpend" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "spendDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" "MarketingCategory" NOT NULL,
    "leadSource" "LeadSource",
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingSpend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentHours" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hoursWorked" DECIMAL(65,30) NOT NULL,
    "activityType" "ActivityType" NOT NULL,
    "dealId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyShowing" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "clientId" TEXT,
    "agentId" TEXT NOT NULL,
    "showingDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result" "ShowingResult" NOT NULL DEFAULT 'NO_INTEREST',
    "notes" TEXT,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyShowing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketData" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "area" TEXT NOT NULL,
    "priceRange" TEXT,
    "activeListings" INTEGER NOT NULL DEFAULT 0,
    "soldListings" INTEGER NOT NULL DEFAULT 0,
    "newListings" INTEGER NOT NULL DEFAULT 0,
    "medianSalePrice" DECIMAL(65,30),
    "averageSalePrice" DECIMAL(65,30),
    "averageDaysOnMarket" DECIMAL(65,30),
    "absorptionRate" DECIMAL(65,30),
    "medianListPrice" DECIMAL(65,30),
    "pricePerSqft" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mandate" (
    "id" TEXT NOT NULL,
    "friendlyId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "assigned_to" TEXT,
    "title" TEXT NOT NULL,
    "transaction_type" "TransactionType",
    "property_type" "PropertyType",
    "property_purpose" "PropertyPurpose",
    "areas_of_interest" JSONB,
    "municipality" TEXT,
    "region" TEXT,
    "size_min_sqm" DECIMAL(65,30),
    "size_max_sqm" DECIMAL(65,30),
    "plot_size_min_sqm" DECIMAL(65,30),
    "plot_size_max_sqm" DECIMAL(65,30),
    "budget_min" DECIMAL(65,30),
    "budget_max" DECIMAL(65,30),
    "bedrooms_min" INTEGER,
    "bedrooms_max" INTEGER,
    "bathrooms_min" INTEGER,
    "bathrooms_max" INTEGER,
    "floor_min" INTEGER,
    "floor_max" INTEGER,
    "ground_floor_only" BOOLEAN DEFAULT false,
    "condition" "PropertyCondition"[],
    "year_built_min" INTEGER,
    "year_built_max" INTEGER,
    "heating_type" "HeatingType"[],
    "energy_cert_min" "EnergyCertClass",
    "furnished" "FurnishedStatus",
    "elevator" BOOLEAN,
    "parking" BOOLEAN,
    "pets_allowed" BOOLEAN,
    "amenities" JSONB,
    "inside_city_plan" BOOLEAN,
    "legalization_ok" BOOLEAN DEFAULT false,
    "status" "MandateStatus" NOT NULL DEFAULT 'DRAFT',
    "urgency" "MandateUrgency" DEFAULT 'MEDIUM',
    "timeline" "Timeline",
    "expires_at" TIMESTAMP(3),
    "notes" TEXT,
    "communication_notes" JSONB,
    "clientId" TEXT,
    "client_linked_at" TIMESTAMP(3),
    "draft_status" BOOLEAN DEFAULT false,

    CONSTRAINT "Mandate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MandateComment" (
    "id" TEXT NOT NULL,
    "mandateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MandateComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "socialPostId" TEXT,
    "feedbackId" TEXT,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "scopes" TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiLog" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseTime" INTEGER NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEndpoint" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "events" TEXT[],
    "secret" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "statusCode" INTEGER,
    "responseBody" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "featuredImage" TEXT,
    "status" "BlogPostStatus" NOT NULL DEFAULT 'DRAFT',
    "authorId" TEXT,
    "tags" TEXT[],
    "categories" TEXT[],
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "publishedAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdVia" TEXT,
    "n8nWorkflowId" TEXT,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "status" "SubscriberStatus" NOT NULL DEFAULT 'ACTIVE',
    "source" TEXT,
    "tags" TEXT[],
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),
    "lastEmailSentAt" TIMESTAMP(3),
    "emailsSentCount" INTEGER NOT NULL DEFAULT 0,
    "emailsOpenedCount" INTEGER NOT NULL DEFAULT 0,
    "emailsClickedCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterCampaign" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "previewText" TEXT,
    "content" TEXT NOT NULL,
    "fromName" TEXT,
    "fromEmail" TEXT,
    "replyTo" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "bounceCount" INTEGER NOT NULL DEFAULT 0,
    "unsubscribeCount" INTEGER NOT NULL DEFAULT 0,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdVia" TEXT,
    "n8nWorkflowId" TEXT,
    "tags" TEXT[],
    "resendBatchId" TEXT,

    CONSTRAINT "NewsletterCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPostLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "platformPostId" TEXT,
    "platformPostUrl" TEXT,
    "content" TEXT,
    "mediaUrls" TEXT[],
    "status" "SocialPostStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DECIMAL(65,30),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdVia" TEXT,
    "n8nWorkflowId" TEXT,
    "n8nExecutionId" TEXT,

    CONSTRAINT "SocialPostLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "N8nConfig" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "webhookSecret" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastHealthCheck" TIMESTAMP(3),
    "lastHealthStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "N8nConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "N8nAgentWorkflow" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "workflowName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "lastRunStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "N8nAgentWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangelogCustomCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChangelogCustomCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangelogEntry" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "customCategoryId" TEXT,
    "status" "ChangelogStatus" NOT NULL DEFAULT 'DRAFT',
    "tags" JSONB,
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChangelogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservedName" (
    "id" TEXT NOT NULL,
    "type" "ReservedNameType" NOT NULL,
    "value" TEXT NOT NULL,
    "normalizedValue" TEXT NOT NULL,
    "status" "ReservedNameStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReservedName_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "commissionRate" DECIMAL(65,30) NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "referralCodeId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "totalEarnings" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralPayout" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "paidByAdminId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAccessLog" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "adminName" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "browserName" TEXT,
    "browserVersion" TEXT,
    "osName" TEXT,
    "osVersion" TEXT,
    "deviceType" TEXT,
    "country" TEXT,
    "city" TEXT,
    "sessionId" TEXT NOT NULL,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationRolePermission" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL,
    "permissions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationRolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserModuleAccess" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "hasAccess" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserModuleAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleModuleAccess" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL,
    "moduleId" TEXT NOT NULL,
    "hasAccess" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleModuleAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportHistory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityType" "ExportEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityIds" TEXT[],
    "exportFormat" TEXT NOT NULL,
    "exportTemplate" TEXT,
    "destination" TEXT,
    "filename" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL DEFAULT 1,
    "dataSnapshot" JSONB,
    "changeFields" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExportHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "channelType" "ChannelType" NOT NULL DEFAULT 'PUBLIC',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelMember" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ChannelMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mutedUntil" TIMESTAMP(3),

    CONSTRAINT "ChannelMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "scope" "ConversationScope" NOT NULL DEFAULT 'ORG',
    "name" TEXT,
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "entityType" "ConversationEntityType",
    "entityId" TEXT,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationParticipant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "mutedUntil" TIMESTAMP(3),
    "lastReadAt" TIMESTAMP(3),

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationKeyShare" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,

    CONSTRAINT "ConversationKeyShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationOrgMembership" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "autoSync" BOOLEAN NOT NULL DEFAULT true,
    "addedById" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationOrgMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "channelId" TEXT,
    "conversationId" TEXT,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentType" "MessageContentType" NOT NULL DEFAULT 'TEXT',
    "parentId" TEXT,
    "threadCount" INTEGER NOT NULL DEFAULT 0,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageReaction" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageRead" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageRead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageAttachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageMention" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageMention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TypingIndicator" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "channelId" TEXT,
    "conversationId" TEXT,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TypingIndicator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPresence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "PresenceStatus" NOT NULL DEFAULT 'OFFLINE',
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statusMessage" TEXT,

    CONSTRAINT "UserPresence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XeIntegration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "authToken" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "autoPublish" BOOLEAN NOT NULL DEFAULT false,
    "publicationType" "XePublicationType" NOT NULL DEFAULT 'BASIC',
    "trademark" TEXT,
    "testMode" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncAt" TIMESTAMP(3),
    "lastPackageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "XeIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XeAgentSettings" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "xeOwnerId" TEXT NOT NULL,
    "majorPhone" TEXT NOT NULL,
    "otherPhones" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "autoPublish" BOOLEAN NOT NULL DEFAULT true,
    "publicationType" "XePublicationType" NOT NULL DEFAULT 'BASIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "XeAgentSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XeSyncHistory" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "policy" "XeSyncPolicy" NOT NULL,
    "requestType" "XeSyncRequestType" NOT NULL,
    "totalItems" INTEGER NOT NULL,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "status" "XeSyncStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "responseEmail" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "XeSyncHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XeSyncItem" (
    "id" TEXT NOT NULL,
    "syncId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "status" "XeSyncItemStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "xeAdId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "XeSyncItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationFeature" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "grantedBy" TEXT,
    "grantedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackgroundJob" (
    "id" TEXT NOT NULL,
    "type" "BackgroundJobType" NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" "BackgroundJobStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "progressMessage" TEXT,
    "k8sJobName" TEXT,
    "k8sPodName" TEXT,
    "payload" JSONB NOT NULL,
    "result" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "priority" "JobPriority" NOT NULL DEFAULT 'NORMAL',

    CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "databaseSiloEnabled" BOOLEAN NOT NULL DEFAULT false,
    "databaseHost" TEXT,
    "databasePort" INTEGER DEFAULT 5432,
    "databaseName" TEXT,
    "databaseUser" TEXT,
    "databasePassword" TEXT,
    "databaseSslEnabled" BOOLEAN NOT NULL DEFAULT true,
    "k8sNamespace" TEXT,
    "k8sResourceQuota" JSONB,
    "k8sStorageClass" TEXT DEFAULT 'standard',
    "customBrandingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "customDomainEnabled" BOOLEAN NOT NULL DEFAULT false,
    "customDomain" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "OrganizationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationSettingsAudit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "settingKey" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,

    CONSTRAINT "OrganizationSettingsAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgEncryptionKey" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "encryptedDek" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgEncryptionKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "description" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "address" TEXT,
    "city" TEXT,
    "region" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'GR',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "socialLinks" JSONB,
    "visibility" "ProfileVisibility" NOT NULL DEFAULT 'PERSONAL',
    "yearFounded" INTEGER,
    "licenseNumber" TEXT,
    "contactFormEnabled" BOOLEAN NOT NULL DEFAULT false,
    "contactFormFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyContactSubmission" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "formData" JSONB NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "senderName" TEXT,
    "senderEmail" TEXT,

    CONSTRAINT "AgencyContactSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationEncryptionStatus" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "keyVersion" INTEGER NOT NULL DEFAULT 1,
    "enabledAt" TIMESTAMP(3),
    "enabledById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationEncryptionStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationEncryptionKey" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wrappedKey" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "keyVersion" INTEGER NOT NULL,
    "grantedById" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "OrganizationEncryptionKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataExportRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'json',
    "status" "DataExportStatus" NOT NULL DEFAULT 'PENDING',
    "downloadUrl" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataExportRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT,
    "details" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSecurityAudit" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT,
    "userName" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "browserName" TEXT,
    "browserVersion" TEXT,
    "osName" TEXT,
    "osVersion" TEXT,
    "deviceType" TEXT,
    "country" TEXT,
    "city" TEXT,
    "path" TEXT,
    "method" TEXT,
    "statusCode" INTEGER,
    "denialReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminSecurityAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DocumentsToCalendarEvents" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DocumentsToCalendarEvents_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_EventToClients" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EventToClients_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_EventToProperties" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EventToProperties_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_DocumentsToClientContacts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DocumentsToClientContacts_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_DocumentsToClients" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DocumentsToClients_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_watching_accounts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_watching_accounts_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_DocumentsToCrmAccountsTasks" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DocumentsToCrmAccountsTasks_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_DocumentsToProperties" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DocumentsToProperties_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_DocumentsToTasksExplicit" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DocumentsToTasksExplicit_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_watching_properties" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_watching_properties_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "AgentConnection_followerId_idx" ON "AgentConnection"("followerId");

-- CreateIndex
CREATE INDEX "AgentConnection_followingId_idx" ON "AgentConnection"("followingId");

-- CreateIndex
CREATE INDEX "AgentConnection_status_idx" ON "AgentConnection"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AgentConnection_followerId_followingId_key" ON "AgentConnection"("followerId", "followingId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentProfile_userId_key" ON "AgentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentProfile_slug_key" ON "AgentProfile"("slug");

-- CreateIndex
CREATE INDEX "AgentProfile_hideFromAgentSearch_idx" ON "AgentProfile"("hideFromAgentSearch");

-- CreateIndex
CREATE INDEX "AgentProfile_slug_idx" ON "AgentProfile"("slug");

-- CreateIndex
CREATE INDEX "AgentProfile_visibility_idx" ON "AgentProfile"("visibility");

-- CreateIndex
CREATE INDEX "AgentContactSubmission_profileId_idx" ON "AgentContactSubmission"("profileId");

-- CreateIndex
CREATE INDEX "AgentContactSubmission_status_idx" ON "AgentContactSubmission"("status");

-- CreateIndex
CREATE INDEX "AgentContactSubmission_createdAt_idx" ON "AgentContactSubmission"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEvent_calendarEventId_key" ON "CalendarEvent"("calendarEventId");

-- CreateIndex
CREATE INDEX "CalendarEvent_assignedUserId_idx" ON "CalendarEvent"("assignedUserId");

-- CreateIndex
CREATE INDEX "CalendarEvent_calendarEventId_idx" ON "CalendarEvent"("calendarEventId");

-- CreateIndex
CREATE INDEX "CalendarEvent_eventType_idx" ON "CalendarEvent"("eventType");

-- CreateIndex
CREATE INDEX "CalendarEvent_friendlyId_idx" ON "CalendarEvent"("friendlyId");

-- CreateIndex
CREATE INDEX "CalendarEvent_organizationId_idx" ON "CalendarEvent"("organizationId");

-- CreateIndex
CREATE INDEX "CalendarEvent_startTime_idx" ON "CalendarEvent"("startTime");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEvent_friendlyId_organizationId_key" ON "CalendarEvent"("friendlyId", "organizationId");

-- CreateIndex
CREATE INDEX "CalendarReminder_eventId_idx" ON "CalendarReminder"("eventId");

-- CreateIndex
CREATE INDEX "CalendarReminder_organizationId_idx" ON "CalendarReminder"("organizationId");

-- CreateIndex
CREATE INDEX "CalendarReminder_scheduledFor_idx" ON "CalendarReminder"("scheduledFor");

-- CreateIndex
CREATE INDEX "CalendarReminder_status_idx" ON "CalendarReminder"("status");

-- CreateIndex
CREATE INDEX "ClientComment_clientId_idx" ON "ClientComment"("clientId");

-- CreateIndex
CREATE INDEX "ClientComment_createdAt_idx" ON "ClientComment"("createdAt");

-- CreateIndex
CREATE INDEX "ClientComment_userId_idx" ON "ClientComment"("userId");

-- CreateIndex
CREATE INDEX "Client_Contacts_assigned_to_idx" ON "Client_Contacts"("assigned_to");

-- CreateIndex
CREATE INDEX "Client_Contacts_clientsIDs_idx" ON "Client_Contacts"("clientsIDs");

-- CreateIndex
CREATE INDEX "Client_Contacts_created_on_idx" ON "Client_Contacts"("created_on");

-- CreateIndex
CREATE INDEX "Client_Contacts_organizationId_idx" ON "Client_Contacts"("organizationId");

-- CreateIndex
CREATE INDEX "Client_Properties_clientId_idx" ON "Client_Properties"("clientId");

-- CreateIndex
CREATE INDEX "Client_Properties_propertyId_idx" ON "Client_Properties"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_Properties_clientId_propertyId_key" ON "Client_Properties"("clientId", "propertyId");

-- CreateIndex
CREATE INDEX "Clients_assigned_to_idx" ON "Clients"("assigned_to");

-- CreateIndex
CREATE INDEX "Clients_client_status_idx" ON "Clients"("client_status");

-- CreateIndex
CREATE INDEX "Clients_createdAt_idx" ON "Clients"("createdAt");

-- CreateIndex
CREATE INDEX "Clients_friendlyId_idx" ON "Clients"("friendlyId");

-- CreateIndex
CREATE INDEX "Clients_organizationId_idx" ON "Clients"("organizationId");

-- CreateIndex
CREATE INDEX "Clients_lead_source_idx" ON "Clients"("lead_source");

-- CreateIndex
CREATE UNIQUE INDEX "Clients_friendlyId_organizationId_key" ON "Clients"("friendlyId", "organizationId");

-- CreateIndex
CREATE INDEX "Deal_clientAgentId_idx" ON "Deal"("clientAgentId");

-- CreateIndex
CREATE INDEX "Deal_clientId_idx" ON "Deal"("clientId");

-- CreateIndex
CREATE INDEX "Deal_friendlyId_idx" ON "Deal"("friendlyId");

-- CreateIndex
CREATE INDEX "Deal_organizationId_idx" ON "Deal"("organizationId");

-- CreateIndex
CREATE INDEX "Deal_propertyAgentId_idx" ON "Deal"("propertyAgentId");

-- CreateIndex
CREATE INDEX "Deal_propertyId_idx" ON "Deal"("propertyId");

-- CreateIndex
CREATE INDEX "Deal_status_idx" ON "Deal"("status");

-- CreateIndex
CREATE INDEX "Deal_dealType_idx" ON "Deal"("dealType");

-- CreateIndex
CREATE INDEX "Deal_leadSource_idx" ON "Deal"("leadSource");

-- CreateIndex
CREATE INDEX "Deal_marketingSpendId_idx" ON "Deal"("marketingSpendId");

-- CreateIndex
CREATE INDEX "Deal_createdAt_idx" ON "Deal"("createdAt");

-- CreateIndex
CREATE INDEX "Deal_closedAt_idx" ON "Deal"("closedAt");

-- CreateIndex
CREATE INDEX "Deal_organizationId_status_idx" ON "Deal"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Deal_organizationId_createdAt_idx" ON "Deal"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Deal_friendlyId_organizationId_key" ON "Deal"("friendlyId", "organizationId");

-- CreateIndex
CREATE INDEX "DocumentTemplate_isActive_idx" ON "DocumentTemplate"("isActive");

-- CreateIndex
CREATE INDEX "DocumentTemplate_templateType_idx" ON "DocumentTemplate"("templateType");

-- CreateIndex
CREATE INDEX "DocumentView_documentId_idx" ON "DocumentView"("documentId");

-- CreateIndex
CREATE INDEX "DocumentView_viewedAt_idx" ON "DocumentView"("viewedAt");

-- CreateIndex
CREATE INDEX "DocumentView_viewerUserId_idx" ON "DocumentView"("viewerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Documents_shareableLink_key" ON "Documents"("shareableLink");

-- CreateIndex
CREATE INDEX "Documents_assigned_user_idx" ON "Documents"("assigned_user");

-- CreateIndex
CREATE INDEX "Documents_created_by_user_idx" ON "Documents"("created_by_user");

-- CreateIndex
CREATE INDEX "Documents_date_created_idx" ON "Documents"("date_created");

-- CreateIndex
CREATE INDEX "Documents_friendlyId_idx" ON "Documents"("friendlyId");

-- CreateIndex
CREATE INDEX "Documents_linkEnabled_idx" ON "Documents"("linkEnabled");

-- CreateIndex
CREATE INDEX "Documents_organizationId_idx" ON "Documents"("organizationId");

-- CreateIndex
CREATE INDEX "Documents_shareableLink_idx" ON "Documents"("shareableLink");

-- CreateIndex
CREATE UNIQUE INDEX "Documents_friendlyId_organizationId_key" ON "Documents"("friendlyId", "organizationId");

-- CreateIndex
CREATE INDEX "EventInvitee_eventId_idx" ON "EventInvitee"("eventId");

-- CreateIndex
CREATE INDEX "EventInvitee_organizationId_idx" ON "EventInvitee"("organizationId");

-- CreateIndex
CREATE INDEX "EventInvitee_status_idx" ON "EventInvitee"("status");

-- CreateIndex
CREATE INDEX "EventInvitee_userId_idx" ON "EventInvitee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EventInvitee_eventId_userId_key" ON "EventInvitee"("eventId", "userId");

-- CreateIndex
CREATE INDEX "Feedback_createdAt_idx" ON "Feedback"("createdAt");

-- CreateIndex
CREATE INDEX "Feedback_feedbackType_idx" ON "Feedback"("feedbackType");

-- CreateIndex
CREATE INDEX "Feedback_organizationId_idx" ON "Feedback"("organizationId");

-- CreateIndex
CREATE INDEX "Feedback_userId_idx" ON "Feedback"("userId");

-- CreateIndex
CREATE INDEX "FeedbackComment_createdAt_idx" ON "FeedbackComment"("createdAt");

-- CreateIndex
CREATE INDEX "FeedbackComment_feedbackId_idx" ON "FeedbackComment"("feedbackId");

-- CreateIndex
CREATE INDEX "IdSequence_prefix_idx" ON "IdSequence"("prefix");

-- CreateIndex
CREATE INDEX "IdSequence_organizationId_idx" ON "IdSequence"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "IdSequence_prefix_organizationId_key" ON "IdSequence"("prefix", "organizationId");

-- CreateIndex
CREATE INDEX "MyAccount_organizationId_idx" ON "MyAccount"("organizationId");

-- CreateIndex
CREATE INDEX "Notification_actorId_idx" ON "Notification"("actorId");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_organizationId_idx" ON "Notification"("organizationId");

-- CreateIndex
CREATE INDEX "Notification_read_idx" ON "Notification"("read");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "ProfileShowcaseProperty_order_idx" ON "ProfileShowcaseProperty"("order");

-- CreateIndex
CREATE INDEX "ProfileShowcaseProperty_profileId_idx" ON "ProfileShowcaseProperty"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileShowcaseProperty_profileId_propertyId_key" ON "ProfileShowcaseProperty"("profileId", "propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "Properties_xeRefId_key" ON "Properties"("xeRefId");

-- CreateIndex
CREATE INDEX "Properties_assigned_to_idx" ON "Properties"("assigned_to");

-- CreateIndex
CREATE INDEX "Properties_createdAt_idx" ON "Properties"("createdAt");

-- CreateIndex
CREATE INDEX "Properties_friendlyId_idx" ON "Properties"("friendlyId");

-- CreateIndex
CREATE INDEX "Properties_organizationId_idx" ON "Properties"("organizationId");

-- CreateIndex
CREATE INDEX "Properties_portal_visibility_idx" ON "Properties"("portal_visibility");

-- CreateIndex
CREATE INDEX "Properties_property_status_idx" ON "Properties"("property_status");

-- CreateIndex
CREATE INDEX "Properties_saleDate_idx" ON "Properties"("saleDate");

-- CreateIndex
CREATE INDEX "Properties_xePublished_idx" ON "Properties"("xePublished");

-- CreateIndex
CREATE UNIQUE INDEX "Properties_friendlyId_organizationId_key" ON "Properties"("friendlyId", "organizationId");

-- CreateIndex
CREATE INDEX "PropertyComment_createdAt_idx" ON "PropertyComment"("createdAt");

-- CreateIndex
CREATE INDEX "PropertyComment_propertyId_idx" ON "PropertyComment"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyComment_userId_idx" ON "PropertyComment"("userId");

-- CreateIndex
CREATE INDEX "SharedEntity_entityType_entityId_idx" ON "SharedEntity"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "SharedEntity_sharedById_idx" ON "SharedEntity"("sharedById");

-- CreateIndex
CREATE INDEX "SharedEntity_sharedWithId_idx" ON "SharedEntity"("sharedWithId");

-- CreateIndex
CREATE UNIQUE INDEX "SharedEntity_entityType_entityId_sharedWithId_key" ON "SharedEntity"("entityType", "entityId", "sharedWithId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialPost_slug_key" ON "SocialPost"("slug");

-- CreateIndex
CREATE INDEX "SocialPost_authorId_idx" ON "SocialPost"("authorId");

-- CreateIndex
CREATE INDEX "SocialPost_createdAt_idx" ON "SocialPost"("createdAt");

-- CreateIndex
CREATE INDEX "SocialPost_organizationId_idx" ON "SocialPost"("organizationId");

-- CreateIndex
CREATE INDEX "SocialPost_postType_idx" ON "SocialPost"("postType");

-- CreateIndex
CREATE INDEX "SocialPost_slug_idx" ON "SocialPost"("slug");

-- CreateIndex
CREATE INDEX "SocialPostComment_createdAt_idx" ON "SocialPostComment"("createdAt");

-- CreateIndex
CREATE INDEX "SocialPostComment_parentId_idx" ON "SocialPostComment"("parentId");

-- CreateIndex
CREATE INDEX "SocialPostComment_postId_idx" ON "SocialPostComment"("postId");

-- CreateIndex
CREATE INDEX "SocialPostComment_userId_idx" ON "SocialPostComment"("userId");

-- CreateIndex
CREATE INDEX "SocialPostLike_postId_idx" ON "SocialPostLike"("postId");

-- CreateIndex
CREATE INDEX "SocialPostLike_userId_idx" ON "SocialPostLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialPostLike_postId_userId_key" ON "SocialPostLike"("postId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserNotificationSettings_userId_key" ON "UserNotificationSettings"("userId");

-- CreateIndex
CREATE INDEX "UserNotificationSettings_userId_idx" ON "UserNotificationSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Users_clerkUserId_key" ON "Users"("clerkUserId");

-- CreateIndex
CREATE INDEX "Users_clerkUserId_idx" ON "Users"("clerkUserId");

-- CreateIndex
CREATE INDEX "Users_email_idx" ON "Users"("email");

-- CreateIndex
CREATE INDEX "Users_userStatus_idx" ON "Users"("userStatus");

-- CreateIndex
CREATE INDEX "crm_Accounts_Tasks_friendlyId_idx" ON "crm_Accounts_Tasks"("friendlyId");

-- CreateIndex
CREATE INDEX "crm_Accounts_Tasks_organizationId_idx" ON "crm_Accounts_Tasks"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "crm_Accounts_Tasks_friendlyId_organizationId_key" ON "crm_Accounts_Tasks"("friendlyId", "organizationId");

-- CreateIndex
CREATE INDEX "crm_Accounts_Tasks_Comments_organizationId_idx" ON "crm_Accounts_Tasks_Comments"("organizationId");

-- CreateIndex
CREATE INDEX "MarketingSpend_organizationId_idx" ON "MarketingSpend"("organizationId");

-- CreateIndex
CREATE INDEX "MarketingSpend_userId_idx" ON "MarketingSpend"("userId");

-- CreateIndex
CREATE INDEX "MarketingSpend_spendDate_idx" ON "MarketingSpend"("spendDate");

-- CreateIndex
CREATE INDEX "MarketingSpend_category_idx" ON "MarketingSpend"("category");

-- CreateIndex
CREATE INDEX "MarketingSpend_leadSource_idx" ON "MarketingSpend"("leadSource");

-- CreateIndex
CREATE INDEX "AgentHours_organizationId_idx" ON "AgentHours"("organizationId");

-- CreateIndex
CREATE INDEX "AgentHours_userId_idx" ON "AgentHours"("userId");

-- CreateIndex
CREATE INDEX "AgentHours_date_idx" ON "AgentHours"("date");

-- CreateIndex
CREATE INDEX "AgentHours_activityType_idx" ON "AgentHours"("activityType");

-- CreateIndex
CREATE INDEX "AgentHours_dealId_idx" ON "AgentHours"("dealId");

-- CreateIndex
CREATE INDEX "PropertyShowing_organizationId_idx" ON "PropertyShowing"("organizationId");

-- CreateIndex
CREATE INDEX "PropertyShowing_propertyId_idx" ON "PropertyShowing"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyShowing_clientId_idx" ON "PropertyShowing"("clientId");

-- CreateIndex
CREATE INDEX "PropertyShowing_agentId_idx" ON "PropertyShowing"("agentId");

-- CreateIndex
CREATE INDEX "PropertyShowing_showingDate_idx" ON "PropertyShowing"("showingDate");

-- CreateIndex
CREATE INDEX "PropertyShowing_result_idx" ON "PropertyShowing"("result");

-- CreateIndex
CREATE INDEX "MarketData_organizationId_idx" ON "MarketData"("organizationId");

-- CreateIndex
CREATE INDEX "MarketData_date_idx" ON "MarketData"("date");

-- CreateIndex
CREATE INDEX "MarketData_area_idx" ON "MarketData"("area");

-- CreateIndex
CREATE UNIQUE INDEX "MarketData_organizationId_date_area_priceRange_key" ON "MarketData"("organizationId", "date", "area", "priceRange");

-- CreateIndex
CREATE INDEX "Mandate_friendlyId_idx" ON "Mandate"("friendlyId");

-- CreateIndex
CREATE INDEX "Mandate_organizationId_idx" ON "Mandate"("organizationId");

-- CreateIndex
CREATE INDEX "Mandate_clientId_idx" ON "Mandate"("clientId");

-- CreateIndex
CREATE INDEX "Mandate_assigned_to_idx" ON "Mandate"("assigned_to");

-- CreateIndex
CREATE INDEX "Mandate_status_idx" ON "Mandate"("status");

-- CreateIndex
CREATE INDEX "Mandate_createdAt_idx" ON "Mandate"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Mandate_friendlyId_organizationId_key" ON "Mandate"("friendlyId", "organizationId");

-- CreateIndex
CREATE INDEX "MandateComment_mandateId_idx" ON "MandateComment"("mandateId");

-- CreateIndex
CREATE INDEX "Attachment_socialPostId_idx" ON "Attachment"("socialPostId");

-- CreateIndex
CREATE INDEX "Attachment_feedbackId_idx" ON "Attachment"("feedbackId");

-- CreateIndex
CREATE INDEX "Attachment_organizationId_idx" ON "Attachment"("organizationId");

-- CreateIndex
CREATE INDEX "Attachment_uploadedById_idx" ON "Attachment"("uploadedById");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_organizationId_idx" ON "ApiKey"("organizationId");

-- CreateIndex
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_createdById_idx" ON "ApiKey"("createdById");

-- CreateIndex
CREATE INDEX "ApiLog_apiKeyId_idx" ON "ApiLog"("apiKeyId");

-- CreateIndex
CREATE INDEX "ApiLog_createdAt_idx" ON "ApiLog"("createdAt");

-- CreateIndex
CREATE INDEX "WebhookEndpoint_organizationId_idx" ON "WebhookEndpoint"("organizationId");

-- CreateIndex
CREATE INDEX "WebhookEndpoint_isActive_idx" ON "WebhookEndpoint"("isActive");

-- CreateIndex
CREATE INDEX "WebhookEndpoint_createdById_idx" ON "WebhookEndpoint"("createdById");

-- CreateIndex
CREATE INDEX "WebhookDelivery_endpointId_idx" ON "WebhookDelivery"("endpointId");

-- CreateIndex
CREATE INDEX "WebhookDelivery_createdAt_idx" ON "WebhookDelivery"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");

-- CreateIndex
CREATE INDEX "BlogPost_organizationId_idx" ON "BlogPost"("organizationId");

-- CreateIndex
CREATE INDEX "BlogPost_status_idx" ON "BlogPost"("status");

-- CreateIndex
CREATE INDEX "BlogPost_publishedAt_idx" ON "BlogPost"("publishedAt");

-- CreateIndex
CREATE INDEX "BlogPost_slug_idx" ON "BlogPost"("slug");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_organizationId_idx" ON "NewsletterSubscriber"("organizationId");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_status_idx" ON "NewsletterSubscriber"("status");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_email_idx" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_organizationId_email_key" ON "NewsletterSubscriber"("organizationId", "email");

-- CreateIndex
CREATE INDEX "NewsletterCampaign_organizationId_idx" ON "NewsletterCampaign"("organizationId");

-- CreateIndex
CREATE INDEX "NewsletterCampaign_status_idx" ON "NewsletterCampaign"("status");

-- CreateIndex
CREATE INDEX "NewsletterCampaign_sentAt_idx" ON "NewsletterCampaign"("sentAt");

-- CreateIndex
CREATE INDEX "SocialPostLog_organizationId_idx" ON "SocialPostLog"("organizationId");

-- CreateIndex
CREATE INDEX "SocialPostLog_platform_idx" ON "SocialPostLog"("platform");

-- CreateIndex
CREATE INDEX "SocialPostLog_status_idx" ON "SocialPostLog"("status");

-- CreateIndex
CREATE INDEX "SocialPostLog_postedAt_idx" ON "SocialPostLog"("postedAt");

-- CreateIndex
CREATE UNIQUE INDEX "N8nConfig_organizationId_key" ON "N8nConfig"("organizationId");

-- CreateIndex
CREATE INDEX "N8nConfig_organizationId_idx" ON "N8nConfig"("organizationId");

-- CreateIndex
CREATE INDEX "N8nConfig_isActive_idx" ON "N8nConfig"("isActive");

-- CreateIndex
CREATE INDEX "N8nAgentWorkflow_organizationId_idx" ON "N8nAgentWorkflow"("organizationId");

-- CreateIndex
CREATE INDEX "N8nAgentWorkflow_agentId_idx" ON "N8nAgentWorkflow"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "N8nAgentWorkflow_organizationId_agentId_workflowId_key" ON "N8nAgentWorkflow"("organizationId", "agentId", "workflowId");

-- CreateIndex
CREATE INDEX "ChangelogCustomCategory_sortOrder_idx" ON "ChangelogCustomCategory"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ChangelogCustomCategory_name_key" ON "ChangelogCustomCategory"("name");

-- CreateIndex
CREATE INDEX "ChangelogEntry_status_idx" ON "ChangelogEntry"("status");

-- CreateIndex
CREATE INDEX "ChangelogEntry_publishedAt_idx" ON "ChangelogEntry"("publishedAt");

-- CreateIndex
CREATE INDEX "ChangelogEntry_version_idx" ON "ChangelogEntry"("version");

-- CreateIndex
CREATE INDEX "ChangelogEntry_createdById_idx" ON "ChangelogEntry"("createdById");

-- CreateIndex
CREATE INDEX "ChangelogEntry_customCategoryId_idx" ON "ChangelogEntry"("customCategoryId");

-- CreateIndex
CREATE INDEX "ReservedName_type_idx" ON "ReservedName"("type");

-- CreateIndex
CREATE INDEX "ReservedName_status_idx" ON "ReservedName"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ReservedName_type_normalizedValue_key" ON "ReservedName"("type", "normalizedValue");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCode_userId_key" ON "ReferralCode"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCode_code_key" ON "ReferralCode"("code");

-- CreateIndex
CREATE INDEX "ReferralCode_code_idx" ON "ReferralCode"("code");

-- CreateIndex
CREATE INDEX "ReferralCode_userId_idx" ON "ReferralCode"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_referredUserId_key" ON "Referral"("referredUserId");

-- CreateIndex
CREATE INDEX "Referral_referralCodeId_idx" ON "Referral"("referralCodeId");

-- CreateIndex
CREATE INDEX "Referral_referredUserId_idx" ON "Referral"("referredUserId");

-- CreateIndex
CREATE INDEX "Referral_status_idx" ON "Referral"("status");

-- CreateIndex
CREATE INDEX "ReferralPayout_referralId_idx" ON "ReferralPayout"("referralId");

-- CreateIndex
CREATE INDEX "ReferralPayout_status_idx" ON "ReferralPayout"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AdminAccessLog_sessionId_key" ON "AdminAccessLog"("sessionId");

-- CreateIndex
CREATE INDEX "AdminAccessLog_adminUserId_idx" ON "AdminAccessLog"("adminUserId");

-- CreateIndex
CREATE INDEX "AdminAccessLog_accessedAt_idx" ON "AdminAccessLog"("accessedAt");

-- CreateIndex
CREATE INDEX "AdminAccessLog_sessionId_idx" ON "AdminAccessLog"("sessionId");

-- CreateIndex
CREATE INDEX "OrganizationRolePermission_organizationId_idx" ON "OrganizationRolePermission"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationRolePermission_organizationId_role_key" ON "OrganizationRolePermission"("organizationId", "role");

-- CreateIndex
CREATE INDEX "UserModuleAccess_organizationId_userId_idx" ON "UserModuleAccess"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserModuleAccess_organizationId_userId_moduleId_key" ON "UserModuleAccess"("organizationId", "userId", "moduleId");

-- CreateIndex
CREATE INDEX "RoleModuleAccess_organizationId_role_idx" ON "RoleModuleAccess"("organizationId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "RoleModuleAccess_organizationId_role_moduleId_key" ON "RoleModuleAccess"("organizationId", "role", "moduleId");

-- CreateIndex
CREATE INDEX "ExportHistory_organizationId_idx" ON "ExportHistory"("organizationId");

-- CreateIndex
CREATE INDEX "ExportHistory_entityType_entityId_idx" ON "ExportHistory"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ExportHistory_userId_idx" ON "ExportHistory"("userId");

-- CreateIndex
CREATE INDEX "ExportHistory_createdAt_idx" ON "ExportHistory"("createdAt");

-- CreateIndex
CREATE INDEX "Channel_organizationId_idx" ON "Channel"("organizationId");

-- CreateIndex
CREATE INDEX "Channel_channelType_idx" ON "Channel"("channelType");

-- CreateIndex
CREATE INDEX "Channel_isArchived_idx" ON "Channel"("isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "Channel_organizationId_slug_key" ON "Channel"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "ChannelMember_userId_idx" ON "ChannelMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelMember_channelId_userId_key" ON "ChannelMember"("channelId", "userId");

-- CreateIndex
CREATE INDEX "Conversation_organizationId_idx" ON "Conversation"("organizationId");

-- CreateIndex
CREATE INDEX "Conversation_scope_idx" ON "Conversation"("scope");

-- CreateIndex
CREATE INDEX "Conversation_entityType_entityId_idx" ON "Conversation"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Conversation_createdById_idx" ON "Conversation"("createdById");

-- CreateIndex
CREATE INDEX "ConversationParticipant_userId_idx" ON "ConversationParticipant"("userId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_userId_leftAt_idx" ON "ConversationParticipant"("userId", "leftAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationParticipant_conversationId_userId_key" ON "ConversationParticipant"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "ConversationKeyShare_userId_idx" ON "ConversationKeyShare"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationKeyShare_conversationId_userId_key" ON "ConversationKeyShare"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "ConversationOrgMembership_organizationId_idx" ON "ConversationOrgMembership"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationOrgMembership_conversationId_organizationId_key" ON "ConversationOrgMembership"("conversationId", "organizationId");

-- CreateIndex
CREATE INDEX "Message_organizationId_idx" ON "Message"("organizationId");

-- CreateIndex
CREATE INDEX "Message_channelId_idx" ON "Message"("channelId");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Message_parentId_idx" ON "Message"("parentId");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");

-- CreateIndex
CREATE INDEX "Message_isDeleted_idx" ON "Message"("isDeleted");

-- CreateIndex
CREATE INDEX "Message_channelId_isDeleted_createdAt_idx" ON "Message"("channelId", "isDeleted", "createdAt");

-- CreateIndex
CREATE INDEX "Message_conversationId_isDeleted_createdAt_idx" ON "Message"("conversationId", "isDeleted", "createdAt");

-- CreateIndex
CREATE INDEX "MessageReaction_messageId_idx" ON "MessageReaction"("messageId");

-- CreateIndex
CREATE INDEX "MessageReaction_userId_idx" ON "MessageReaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageReaction_messageId_userId_emoji_key" ON "MessageReaction"("messageId", "userId", "emoji");

-- CreateIndex
CREATE INDEX "MessageRead_messageId_idx" ON "MessageRead"("messageId");

-- CreateIndex
CREATE INDEX "MessageRead_userId_idx" ON "MessageRead"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageRead_messageId_userId_key" ON "MessageRead"("messageId", "userId");

-- CreateIndex
CREATE INDEX "MessageAttachment_messageId_idx" ON "MessageAttachment"("messageId");

-- CreateIndex
CREATE INDEX "MessageMention_messageId_idx" ON "MessageMention"("messageId");

-- CreateIndex
CREATE INDEX "MessageMention_userId_idx" ON "MessageMention"("userId");

-- CreateIndex
CREATE INDEX "TypingIndicator_expiresAt_idx" ON "TypingIndicator"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "TypingIndicator_channelId_userId_key" ON "TypingIndicator"("channelId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TypingIndicator_conversationId_userId_key" ON "TypingIndicator"("conversationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPresence_userId_key" ON "UserPresence"("userId");

-- CreateIndex
CREATE INDEX "UserPresence_status_idx" ON "UserPresence"("status");

-- CreateIndex
CREATE INDEX "UserPresence_lastSeenAt_idx" ON "UserPresence"("lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "XeIntegration_organizationId_key" ON "XeIntegration"("organizationId");

-- CreateIndex
CREATE INDEX "XeIntegration_organizationId_idx" ON "XeIntegration"("organizationId");

-- CreateIndex
CREATE INDEX "XeIntegration_isActive_idx" ON "XeIntegration"("isActive");

-- CreateIndex
CREATE INDEX "XeAgentSettings_integrationId_idx" ON "XeAgentSettings"("integrationId");

-- CreateIndex
CREATE INDEX "XeAgentSettings_agentId_idx" ON "XeAgentSettings"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "XeAgentSettings_integrationId_agentId_key" ON "XeAgentSettings"("integrationId", "agentId");

-- CreateIndex
CREATE UNIQUE INDEX "XeSyncHistory_packageId_key" ON "XeSyncHistory"("packageId");

-- CreateIndex
CREATE INDEX "XeSyncHistory_integrationId_idx" ON "XeSyncHistory"("integrationId");

-- CreateIndex
CREATE INDEX "XeSyncHistory_status_idx" ON "XeSyncHistory"("status");

-- CreateIndex
CREATE INDEX "XeSyncHistory_submittedAt_idx" ON "XeSyncHistory"("submittedAt");

-- CreateIndex
CREATE INDEX "XeSyncItem_syncId_idx" ON "XeSyncItem"("syncId");

-- CreateIndex
CREATE INDEX "XeSyncItem_propertyId_idx" ON "XeSyncItem"("propertyId");

-- CreateIndex
CREATE INDEX "XeSyncItem_status_idx" ON "XeSyncItem"("status");

-- CreateIndex
CREATE UNIQUE INDEX "XeSyncItem_syncId_propertyId_key" ON "XeSyncItem"("syncId", "propertyId");

-- CreateIndex
CREATE INDEX "OrganizationFeature_organizationId_idx" ON "OrganizationFeature"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationFeature_feature_idx" ON "OrganizationFeature"("feature");

-- CreateIndex
CREATE INDEX "OrganizationFeature_isEnabled_idx" ON "OrganizationFeature"("isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationFeature_organizationId_feature_key" ON "OrganizationFeature"("organizationId", "feature");

-- CreateIndex
CREATE INDEX "BackgroundJob_organizationId_type_idx" ON "BackgroundJob"("organizationId", "type");

-- CreateIndex
CREATE INDEX "BackgroundJob_status_idx" ON "BackgroundJob"("status");

-- CreateIndex
CREATE INDEX "BackgroundJob_k8sJobName_idx" ON "BackgroundJob"("k8sJobName");

-- CreateIndex
CREATE INDEX "BackgroundJob_createdAt_idx" ON "BackgroundJob"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSettings_organizationId_key" ON "OrganizationSettings"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationSettings_organizationId_idx" ON "OrganizationSettings"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationSettings_databaseSiloEnabled_idx" ON "OrganizationSettings"("databaseSiloEnabled");

-- CreateIndex
CREATE INDEX "OrganizationSettingsAudit_organizationId_idx" ON "OrganizationSettingsAudit"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationSettingsAudit_changedAt_idx" ON "OrganizationSettingsAudit"("changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrgEncryptionKey_organizationId_key" ON "OrgEncryptionKey"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "AgencyProfile_organizationId_key" ON "AgencyProfile"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "AgencyProfile_slug_key" ON "AgencyProfile"("slug");

-- CreateIndex
CREATE INDEX "AgencyProfile_slug_idx" ON "AgencyProfile"("slug");

-- CreateIndex
CREATE INDEX "AgencyProfile_organizationId_idx" ON "AgencyProfile"("organizationId");

-- CreateIndex
CREATE INDEX "AgencyProfile_visibility_idx" ON "AgencyProfile"("visibility");

-- CreateIndex
CREATE INDEX "AgencyContactSubmission_profileId_idx" ON "AgencyContactSubmission"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationEncryptionStatus_organizationId_key" ON "OrganizationEncryptionStatus"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationEncryptionStatus_organizationId_idx" ON "OrganizationEncryptionStatus"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationEncryptionKey_organizationId_idx" ON "OrganizationEncryptionKey"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationEncryptionKey_userId_idx" ON "OrganizationEncryptionKey"("userId");

-- CreateIndex
CREATE INDEX "OrganizationEncryptionKey_organizationId_userId_keyVersion_idx" ON "OrganizationEncryptionKey"("organizationId", "userId", "keyVersion");

-- CreateIndex
CREATE INDEX "DataExportRequest_organizationId_idx" ON "DataExportRequest"("organizationId");

-- CreateIndex
CREATE INDEX "DataExportRequest_requestedById_idx" ON "DataExportRequest"("requestedById");

-- CreateIndex
CREATE INDEX "DataExportRequest_status_idx" ON "DataExportRequest"("status");

-- CreateIndex
CREATE INDEX "AdminAuditLog_adminId_idx" ON "AdminAuditLog"("adminId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_action_idx" ON "AdminAuditLog"("action");

-- CreateIndex
CREATE INDEX "AdminAuditLog_timestamp_idx" ON "AdminAuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AdminSecurityAudit_eventType_idx" ON "AdminSecurityAudit"("eventType");

-- CreateIndex
CREATE INDEX "AdminSecurityAudit_userId_idx" ON "AdminSecurityAudit"("userId");

-- CreateIndex
CREATE INDEX "AdminSecurityAudit_createdAt_idx" ON "AdminSecurityAudit"("createdAt");

-- CreateIndex
CREATE INDEX "_DocumentsToCalendarEvents_B_index" ON "_DocumentsToCalendarEvents"("B");

-- CreateIndex
CREATE INDEX "_EventToClients_B_index" ON "_EventToClients"("B");

-- CreateIndex
CREATE INDEX "_EventToProperties_B_index" ON "_EventToProperties"("B");

-- CreateIndex
CREATE INDEX "_DocumentsToClientContacts_B_index" ON "_DocumentsToClientContacts"("B");

-- CreateIndex
CREATE INDEX "_DocumentsToClients_B_index" ON "_DocumentsToClients"("B");

-- CreateIndex
CREATE INDEX "_watching_accounts_B_index" ON "_watching_accounts"("B");

-- CreateIndex
CREATE INDEX "_DocumentsToCrmAccountsTasks_B_index" ON "_DocumentsToCrmAccountsTasks"("B");

-- CreateIndex
CREATE INDEX "_DocumentsToProperties_B_index" ON "_DocumentsToProperties"("B");

-- CreateIndex
CREATE INDEX "_DocumentsToTasksExplicit_B_index" ON "_DocumentsToTasksExplicit"("B");

-- CreateIndex
CREATE INDEX "_watching_properties_B_index" ON "_watching_properties"("B");

-- AddForeignKey
ALTER TABLE "AgentConnection" ADD CONSTRAINT "AgentConnection_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentConnection" ADD CONSTRAINT "AgentConnection_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentProfile" ADD CONSTRAINT "AgentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentContactSubmission" ADD CONSTRAINT "AgentContactSubmission_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AgentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarReminder" ADD CONSTRAINT "CalendarReminder_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientComment" ADD CONSTRAINT "ClientComment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientComment" ADD CONSTRAINT "ClientComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client_Contacts" ADD CONSTRAINT "Client_Contacts_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client_Contacts" ADD CONSTRAINT "Client_Contacts_clientsIDs_fkey" FOREIGN KEY ("clientsIDs") REFERENCES "Clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client_Contacts" ADD CONSTRAINT "Client_Contacts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client_Properties" ADD CONSTRAINT "Client_Properties_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client_Properties" ADD CONSTRAINT "Client_Properties_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clients" ADD CONSTRAINT "Clients_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_clientAgentId_fkey" FOREIGN KEY ("clientAgentId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_propertyAgentId_fkey" FOREIGN KEY ("propertyAgentId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_marketingSpendId_fkey" FOREIGN KEY ("marketingSpendId") REFERENCES "MarketingSpend"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentView" ADD CONSTRAINT "DocumentView_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentView" ADD CONSTRAINT "DocumentView_viewerUserId_fkey" FOREIGN KEY ("viewerUserId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documents" ADD CONSTRAINT "Documents_assigned_user_fkey" FOREIGN KEY ("assigned_user") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documents" ADD CONSTRAINT "Documents_created_by_user_fkey" FOREIGN KEY ("created_by_user") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documents" ADD CONSTRAINT "Documents_document_type_fkey" FOREIGN KEY ("document_type") REFERENCES "Documents_Types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInvitee" ADD CONSTRAINT "EventInvitee_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInvitee" ADD CONSTRAINT "EventInvitee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackComment" ADD CONSTRAINT "FeedbackComment_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "Feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileShowcaseProperty" ADD CONSTRAINT "ProfileShowcaseProperty_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AgentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileShowcaseProperty" ADD CONSTRAINT "ProfileShowcaseProperty_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Properties" ADD CONSTRAINT "Properties_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyComment" ADD CONSTRAINT "PropertyComment_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyComment" ADD CONSTRAINT "PropertyComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property_Contacts" ADD CONSTRAINT "Property_Contacts_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property_Contacts" ADD CONSTRAINT "Property_Contacts_property_fkey" FOREIGN KEY ("property") REFERENCES "Properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedEntity" ADD CONSTRAINT "SharedEntity_sharedById_fkey" FOREIGN KEY ("sharedById") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedEntity" ADD CONSTRAINT "SharedEntity_sharedWithId_fkey" FOREIGN KEY ("sharedWithId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPostComment" ADD CONSTRAINT "SocialPostComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "SocialPostComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPostComment" ADD CONSTRAINT "SocialPostComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SocialPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPostComment" ADD CONSTRAINT "SocialPostComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPostLike" ADD CONSTRAINT "SocialPostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SocialPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPostLike" ADD CONSTRAINT "SocialPostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNotificationSettings" ADD CONSTRAINT "UserNotificationSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Accounts_Tasks" ADD CONSTRAINT "crm_Accounts_Tasks_account_fkey" FOREIGN KEY ("account") REFERENCES "Clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Accounts_Tasks" ADD CONSTRAINT "crm_Accounts_Tasks_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "CalendarEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Accounts_Tasks" ADD CONSTRAINT "crm_Accounts_Tasks_user_fkey" FOREIGN KEY ("user") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Accounts_Tasks_Comments" ADD CONSTRAINT "crm_Accounts_Tasks_Comments_crm_account_task_fkey" FOREIGN KEY ("crm_account_task") REFERENCES "crm_Accounts_Tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Accounts_Tasks_Comments" ADD CONSTRAINT "crm_Accounts_Tasks_Comments_user_fkey" FOREIGN KEY ("user") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentHours" ADD CONSTRAINT "AgentHours_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyShowing" ADD CONSTRAINT "PropertyShowing_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyShowing" ADD CONSTRAINT "PropertyShowing_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mandate" ADD CONSTRAINT "Mandate_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mandate" ADD CONSTRAINT "Mandate_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MandateComment" ADD CONSTRAINT "MandateComment_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "Mandate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MandateComment" ADD CONSTRAINT "MandateComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_socialPostId_fkey" FOREIGN KEY ("socialPostId") REFERENCES "SocialPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "Feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiLog" ADD CONSTRAINT "ApiLog_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "WebhookEndpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangelogEntry" ADD CONSTRAINT "ChangelogEntry_customCategoryId_fkey" FOREIGN KEY ("customCategoryId") REFERENCES "ChangelogCustomCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangelogEntry" ADD CONSTRAINT "ChangelogEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCode" ADD CONSTRAINT "ReferralCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referralCodeId_fkey" FOREIGN KEY ("referralCodeId") REFERENCES "ReferralCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralPayout" ADD CONSTRAINT "ReferralPayout_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelMember" ADD CONSTRAINT "ChannelMember_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationKeyShare" ADD CONSTRAINT "ConversationKeyShare_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationOrgMembership" ADD CONSTRAINT "ConversationOrgMembership_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageRead" ADD CONSTRAINT "MessageRead_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageMention" ADD CONSTRAINT "MessageMention_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XeAgentSettings" ADD CONSTRAINT "XeAgentSettings_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "XeIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XeSyncHistory" ADD CONSTRAINT "XeSyncHistory_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "XeIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XeSyncItem" ADD CONSTRAINT "XeSyncItem_syncId_fkey" FOREIGN KEY ("syncId") REFERENCES "XeSyncHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XeSyncItem" ADD CONSTRAINT "XeSyncItem_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyContactSubmission" ADD CONSTRAINT "AgencyContactSubmission_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AgencyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationEncryptionKey" ADD CONSTRAINT "OrganizationEncryptionKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationEncryptionKey" ADD CONSTRAINT "OrganizationEncryptionKey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "OrganizationEncryptionStatus"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentsToCalendarEvents" ADD CONSTRAINT "_DocumentsToCalendarEvents_A_fkey" FOREIGN KEY ("A") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentsToCalendarEvents" ADD CONSTRAINT "_DocumentsToCalendarEvents_B_fkey" FOREIGN KEY ("B") REFERENCES "Documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventToClients" ADD CONSTRAINT "_EventToClients_A_fkey" FOREIGN KEY ("A") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventToClients" ADD CONSTRAINT "_EventToClients_B_fkey" FOREIGN KEY ("B") REFERENCES "Clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventToProperties" ADD CONSTRAINT "_EventToProperties_A_fkey" FOREIGN KEY ("A") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventToProperties" ADD CONSTRAINT "_EventToProperties_B_fkey" FOREIGN KEY ("B") REFERENCES "Properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentsToClientContacts" ADD CONSTRAINT "_DocumentsToClientContacts_A_fkey" FOREIGN KEY ("A") REFERENCES "Client_Contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentsToClientContacts" ADD CONSTRAINT "_DocumentsToClientContacts_B_fkey" FOREIGN KEY ("B") REFERENCES "Documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentsToClients" ADD CONSTRAINT "_DocumentsToClients_A_fkey" FOREIGN KEY ("A") REFERENCES "Clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentsToClients" ADD CONSTRAINT "_DocumentsToClients_B_fkey" FOREIGN KEY ("B") REFERENCES "Documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_watching_accounts" ADD CONSTRAINT "_watching_accounts_A_fkey" FOREIGN KEY ("A") REFERENCES "Clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_watching_accounts" ADD CONSTRAINT "_watching_accounts_B_fkey" FOREIGN KEY ("B") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentsToCrmAccountsTasks" ADD CONSTRAINT "_DocumentsToCrmAccountsTasks_A_fkey" FOREIGN KEY ("A") REFERENCES "Documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentsToCrmAccountsTasks" ADD CONSTRAINT "_DocumentsToCrmAccountsTasks_B_fkey" FOREIGN KEY ("B") REFERENCES "crm_Accounts_Tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentsToProperties" ADD CONSTRAINT "_DocumentsToProperties_A_fkey" FOREIGN KEY ("A") REFERENCES "Documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentsToProperties" ADD CONSTRAINT "_DocumentsToProperties_B_fkey" FOREIGN KEY ("B") REFERENCES "Properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentsToTasksExplicit" ADD CONSTRAINT "_DocumentsToTasksExplicit_A_fkey" FOREIGN KEY ("A") REFERENCES "Documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DocumentsToTasksExplicit" ADD CONSTRAINT "_DocumentsToTasksExplicit_B_fkey" FOREIGN KEY ("B") REFERENCES "crm_Accounts_Tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_watching_properties" ADD CONSTRAINT "_watching_properties_A_fkey" FOREIGN KEY ("A") REFERENCES "Properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_watching_properties" ADD CONSTRAINT "_watching_properties_B_fkey" FOREIGN KEY ("B") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

