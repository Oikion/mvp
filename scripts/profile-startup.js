#!/usr/bin/env node

/**
 * Startup Profiler for Next.js Dev Server
 * 
 * This script wraps the Next.js dev command and adds timing information
 * to help identify startup bottlenecks.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const startTime = Date.now();
const timings = [];

function logTiming(label) {
  const elapsed = Date.now() - startTime;
  timings.push({ label, elapsed });
  console.log(`[TIMING] ${label}: ${elapsed}ms`);
}

// Log initial startup
logTiming('Script started');

// Parse command line arguments
const args = process.argv.slice(2);
const isVerbose = args.includes('--verbose') || args.includes('-v');

// Find the next dev command
const nextIndex = args.findIndex(arg => arg === 'next');
const devIndex = args.findIndex(arg => arg === 'dev');

if (nextIndex === -1 || devIndex === -1) {
  console.error('Usage: node scripts/profile-startup.js next dev [options]');
  process.exit(1);
}

// Extract Next.js command and options
const nextCommand = args.slice(nextIndex);

// Create log file
const logFile = path.join(process.cwd(), 'startup-profile.log');
const logStream = fs.createWriteStream(logFile, { flags: 'w' });

logStream.write(`=== Next.js Dev Server Startup Profile ===\n`);
logStream.write(`Started at: ${new Date().toISOString()}\n`);
logStream.write(`Command: ${nextCommand.join(' ')}\n\n`);

// Spawn Next.js process (use npx to run next directly)
const nextProcess = spawn('npx', nextCommand, {
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true,
  env: {
    ...process.env,
    NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --trace-warnings`.trim(),
  },
});

let outputBuffer = '';

// Capture stdout
nextProcess.stdout.on('data', (data) => {
  const output = data.toString();
  outputBuffer += output;
  
  // Log to console
  process.stdout.write(output);
  
  // Log to file
  logStream.write(`[STDOUT] ${output}`);
  
  // Detect key events
  if (output.includes('Starting...')) {
    logTiming('Next.js "Starting..." message');
  }
  if (output.includes('Ready in')) {
    logTiming('Next.js "Ready" message');
    const match = output.match(/Ready in ([\d.]+)s/);
    if (match) {
      logStream.write(`\n=== Startup Complete ===\n`);
      logStream.write(`Total time: ${match[1]}s\n\n`);
      logStream.write(`=== Timing Breakdown ===\n`);
      timings.forEach(({ label, elapsed }) => {
        logStream.write(`${label}: ${elapsed}ms\n`);
      });
    }
  }
});

// Capture stderr
nextProcess.stderr.on('data', (data) => {
  const output = data.toString();
  outputBuffer += output;
  
  // Log to console
  process.stderr.write(output);
  
  // Log to file
  logStream.write(`[STDERR] ${output}`);
  
  // Detect compilation events
  if (output.includes('Compiling')) {
    const match = output.match(/Compiling (.*?)[\s\n]/);
    if (match) {
      logTiming(`Compiling: ${match[1]}`);
    }
  }
});

// Handle process exit
nextProcess.on('exit', (code) => {
  logTiming('Process exited');
  logStream.write(`\n=== Process Exit ===\n`);
  logStream.write(`Exit code: ${code}\n`);
  logStream.end();
  
  console.log(`\n[PROFILE] Log saved to: ${logFile}`);
  console.log(`[PROFILE] Total timings captured: ${timings.length}`);
  
  process.exit(code || 0);
});

// Handle errors
nextProcess.on('error', (error) => {
  console.error(`[PROFILE ERROR] Failed to start process:`, error);
  logStream.write(`\n=== Error ===\n${error.message}\n`);
  logStream.end();
  process.exit(1);
});
