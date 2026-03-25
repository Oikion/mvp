-- AlterTable
ALTER TABLE "UserIdentityKey" ADD COLUMN     "signingPublicKey" TEXT,
ADD COLUMN     "signingSalt" TEXT,
ADD COLUMN     "wrappedSigningPrivateKey" TEXT;
