#!/usr/bin/env node

/**
 * Sync package.json version from NEXT_PUBLIC_APP_V environment variable
 * 
 * This script reads the NEXT_PUBLIC_APP_V env variable and updates
 * package.json version field to match. This ensures the version shown
 * in terminal output matches the app version displayed in the UI.
 * 
 * Usage: node scripts/sync-version.js
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local if it exists
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

// Load .env.local
loadEnvFile();

// Get version from environment variable
const appVersion = process.env.NEXT_PUBLIC_APP_V;

if (!appVersion) {
  console.warn('[sync-version] Warning: NEXT_PUBLIC_APP_V not set, skipping version sync');
  process.exit(0);
}

// Read package.json
const packageJsonPath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Check if version needs updating
if (packageJson.version === appVersion) {
  // Version already matches, no need to update
  process.exit(0);
}

// Update version
const oldVersion = packageJson.version;
packageJson.version = appVersion;

// Write back to package.json
fs.writeFileSync(
  packageJsonPath,
  JSON.stringify(packageJson, null, 2) + '\n',
  'utf8'
);

console.log(`[sync-version] Updated package.json version: ${oldVersion} → ${appVersion}`);
