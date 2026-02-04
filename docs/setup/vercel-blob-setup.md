# Vercel Blob Setup Instructions

## Overview
This document provides step-by-step instructions for setting up Vercel Blob storage for the Documents feature.

## Prerequisites
- A Vercel account
- A Vercel project (or create a new one)

## Step 1: Create a Blob Store in Vercel

1. Log in to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (or create a new one)
3. Navigate to the **Storage** tab in your project dashboard
4. Click **Create Database** or **Add Storage**
5. Select **Blob** from the storage options
6. Provide a name for your Blob store (e.g., "documents" or "papermark-blob")
7. Select your preferred region (choose the region closest to your users)
8. Click **Create**

## Step 2: Get Your Blob Token

After creating the Blob store, Vercel automatically generates a `BLOB_READ_WRITE_TOKEN` environment variable:

1. In your Vercel project dashboard, go to **Settings** → **Environment Variables**
2. Find `BLOB_READ_WRITE_TOKEN` in the list
3. Copy the token value (you'll need it for local development)

## Step 3: Configure Environment Variables

### For Production (Vercel)
The `BLOB_READ_WRITE_TOKEN` is automatically added to your Vercel project. No additional configuration needed.

### For Local Development

1. **Pull environment variables from Vercel** (recommended):
   ```bash
   # Install Vercel CLI if you haven't already
   npm i -g vercel
   
   # Login to Vercel
   vercel login
   
   # Link your project (if not already linked)
   vercel link
   
   # Pull environment variables
   vercel env pull .env.local
   ```

2. **Or manually add to your `.env.local` file**:
   ```env
   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

## Step 4: Verify Installation

The `@vercel/blob` package has already been installed. Verify it's in your `package.json`:

```bash
cat package.json | grep "@vercel/blob"
```

You should see:
```json
"@vercel/blob": "^2.0.0"
```

## Step 5: Run Database Migration

After setting up the Blob store, you need to update your database schema:

```bash
# Generate Prisma client with new schema
npx prisma generate

# Push schema changes to database
npx prisma db push

# Or create a migration
npx prisma migrate dev --name add_papermark_documents
```

## Step 6: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `/documents` in your application
3. Try uploading a document
4. Verify the document appears in your Vercel Blob store:
   - Go to Vercel Dashboard → Your Project → Storage → Your Blob Store
   - You should see the uploaded file

## Troubleshooting

### Error: "BLOB_READ_WRITE_TOKEN is not defined"
- Make sure you've added the token to your `.env.local` file
- Restart your development server after adding the variable
- Verify the variable name is exactly `BLOB_READ_WRITE_TOKEN`

### Error: "Unauthorized" or "403 Forbidden"
- Check that your Blob token has the correct permissions
- Ensure you're using the `BLOB_READ_WRITE_TOKEN` (not a read-only token)
- Verify the token hasn't expired (Vercel tokens don't expire, but check anyway)

### Files not appearing in Blob store
- Check your browser's network tab for upload errors
- Verify the file size is within Vercel Blob limits (check Vercel documentation for current limits)
- Check server logs for any upload errors

## Additional Resources

- [Vercel Blob Documentation](https://vercel.com/docs/storage/vercel-blob)
- [Vercel Blob API Reference](https://vercel.com/docs/storage/vercel-blob/using-blob-sdk)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

## Next Steps

After completing the setup:
1. Test document uploads and downloads
2. Test shareable links functionality
3. Verify analytics tracking works correctly
4. Set up any custom domain mappings if needed (see Vercel Blob docs)

