#!/usr/bin/env node

/**
 * Writes NEXT_PUBLIC_APP_V from package.json into .env.local so the app UI
 * and terminal output always reflect the version managed by semantic-release.
 *
 * package.json is the source of truth — do not set NEXT_PUBLIC_APP_V manually.
 */

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(process.cwd(), 'package.json');
const envLocalPath = path.join(process.cwd(), '.env.local');

const { version } = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

let envContent = fs.existsSync(envLocalPath) ? fs.readFileSync(envLocalPath, 'utf8') : '';

if (envContent.match(/^NEXT_PUBLIC_APP_V=.*/m)) {
  const existing = envContent.match(/^NEXT_PUBLIC_APP_V=(.*)$/m)?.[1];
  if (existing === version) process.exit(0);
  envContent = envContent.replace(/^NEXT_PUBLIC_APP_V=.*/m, `NEXT_PUBLIC_APP_V=${version}`);
} else {
  envContent = envContent.trimEnd() + `\nNEXT_PUBLIC_APP_V=${version}\n`;
}

fs.writeFileSync(envLocalPath, envContent, 'utf8');
console.log(`[sync-version] NEXT_PUBLIC_APP_V=${version}`);
