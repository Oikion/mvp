/**
 * Structured logger for Oikion.
 *
 * Wraps console.* with a consistent `[TAG]` prefix that matches the
 * existing logging convention. All output flows through Vercel's log
 * pipeline and is captured by the @vercel/otel instrumentation.
 *
 * Usage:
 *   logger.info("WEBHOOK", { userId, event: evt.type })
 *   logger.warn("MATCHMAKING", "No properties found for criteria")
 *   logger.error("DEALS_POST", err)
 *
 * Swapping the backend (e.g. to Pino or Axiom) only requires editing this file.
 */

type LogData = unknown;

function formatTag(tag: string) {
  return `[${tag}]`;
}

export const logger = {
  info(tag: string, data?: LogData) {
    if (data !== undefined) {
      console.log(formatTag(tag), data);
    } else {
      console.log(formatTag(tag));
    }
  },

  warn(tag: string, data?: LogData) {
    if (data !== undefined) {
      console.warn(formatTag(tag), data);
    } else {
      console.warn(formatTag(tag));
    }
  },

  error(tag: string, error: LogData) {
    console.error(formatTag(tag), error);
  },
};
