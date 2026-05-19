-- Add TLS toggle to EmailInboxConfig (default true = port 993 SSL)
ALTER TABLE "email_inbox_configs" ADD COLUMN "imapUseTLS" BOOLEAN NOT NULL DEFAULT true;

-- Add EMAIL_INBOUND variant to ContactSource enum (for contacts created from inbound emails)
ALTER TYPE "ContactSource" ADD VALUE 'EMAIL_INBOUND';
