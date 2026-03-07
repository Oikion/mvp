/**
 * Cron Schedule Configuration for Market Intelligence Scrapers
 * 
 * Scrapes are staggered to:
 * 1. Avoid overwhelming any single platform
 * 2. Spread API usage over time
 * 3. Allow time for data processing between scrapes
 * 
 * Cron Format: "minute hour dayOfMonth month dayOfWeek"
 */

export interface ScheduleConfig {
  platform: string;
  cron: string;
  description: string;
  filters?: {
    transactionType?: 'sale' | 'rent';
    propertyTypes?: string[];
    areas?: string[];
  };
  maxPages?: number;
}

/**
 * Default daily schedules - staggered throughout the night (Greek time)
 * 
 * Night scraping (2-6 AM) chosen because:
 * - Lower server load on target sites
 * - Less chance of rate limiting
 * - Data ready for morning analysis
 */
export const DEFAULT_SCHEDULES: ScheduleConfig[] = [
  {
    platform: 'spitogatos',
    cron: '0 2 * * *',  // 2:00 AM daily
    description: 'Spitogatos daily full scrape',
    maxPages: 100
  },
  {
    platform: 'xe_gr',
    cron: '0 4 * * *',  // 4:00 AM daily
    description: 'XE.gr daily full scrape',
    maxPages: 100
  },
  {
    platform: 'tospitimou',
    cron: '0 6 * * *',  // 6:00 AM daily
    description: 'Tospitimou daily full scrape',
    maxPages: 50
  }
];

/**
 * Optional high-frequency schedules for specific areas
 * Useful for monitoring hot markets
 */
export const HIGH_PRIORITY_SCHEDULES: ScheduleConfig[] = [
  {
    platform: 'spitogatos',
    cron: '0 14 * * *',  // 2:00 PM daily (second run)
    description: 'Spitogatos afternoon check - Athens only',
    filters: {
      areas: ['Αθήνα', 'Κολωνάκι', 'Κηφισιά', 'Γλυφάδα']
    },
    maxPages: 20
  },
  {
    platform: 'xe_gr',
    cron: '0 16 * * *',  // 4:00 PM daily (second run)
    description: 'XE.gr afternoon check - Athens only',
    filters: {
      areas: ['Αθήνα', 'Κολωνάκι', 'Κηφισιά', 'Γλυφάδα']
    },
    maxPages: 20
  }
];

/**
 * Weekly comprehensive scrapes for historical data
 */
export const WEEKLY_SCHEDULES: ScheduleConfig[] = [
  {
    platform: 'spitogatos',
    cron: '0 1 * * 0',  // 1:00 AM Sunday
    description: 'Spitogatos weekly deep scrape',
    maxPages: 200
  },
  {
    platform: 'xe_gr',
    cron: '0 3 * * 0',  // 3:00 AM Sunday
    description: 'XE.gr weekly deep scrape',
    maxPages: 200
  },
  {
    platform: 'tospitimou',
    cron: '0 5 * * 0',  // 5:00 AM Sunday
    description: 'Tospitimou weekly deep scrape',
    maxPages: 100
  }
];

/**
 * Get all active schedules based on environment
 */
export function getActiveSchedules(): ScheduleConfig[] {
  const env = process.env.SCRAPER_MODE || 'standard';
  
  switch (env) {
    case 'minimal':
      // Only run daily base schedules
      return DEFAULT_SCHEDULES;
    
    case 'standard':
      // Daily + weekly deep scrapes
      return [...DEFAULT_SCHEDULES, ...WEEKLY_SCHEDULES];
    
    case 'aggressive':
      // All schedules including high-priority area checks
      return [
        ...DEFAULT_SCHEDULES,
        ...HIGH_PRIORITY_SCHEDULES,
        ...WEEKLY_SCHEDULES
      ];
    
    case 'testing':
      // Run every 4 hours for testing (don't use in production!)
      return [
        {
          platform: 'spitogatos',
          cron: '0 */4 * * *',
          description: 'Testing schedule',
          maxPages: 5
        }
      ];
    
    default:
      return DEFAULT_SCHEDULES;
  }
}

/**
 * Validate cron expression
 */
export function isValidCron(expression: string): boolean {
  const cronRegex = /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/;
  return cronRegex.test(expression);
}

/**
 * Get human-readable description of cron schedule
 */
export function describeCron(expression: string): string {
  const parts = expression.split(' ');
  if (parts.length !== 5) return 'Invalid cron expression';

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Simple descriptions for common patterns
  if (dayOfWeek !== '*' && dayOfMonth === '*' && month === '*') {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return `Every ${days[parseInt(dayOfWeek)]} at ${hour}:${minute.padStart(2, '0')}`;
  }

  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `Daily at ${hour}:${minute.padStart(2, '0')}`;
  }

  if (hour.includes('*/')) {
    const interval = hour.replace('*/', '');
    return `Every ${interval} hours`;
  }

  return `At ${hour}:${minute.padStart(2, '0')} (cron: ${expression})`;
}
