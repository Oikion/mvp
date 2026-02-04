/**
 * Structured logging for workers
 */

import pino from 'pino';

const logLevel = process.env.LOG_LEVEL || 'info';
const isPretty = process.env.NODE_ENV !== 'production';

export function getLogger(name: string) {
  return pino({
    name,
    level: logLevel,
    transport: isPretty
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
          },
        }
      : undefined,
  });
}
