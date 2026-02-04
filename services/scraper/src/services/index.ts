/**
 * Service Module Exports
 */

export { 
  findDuplicates, 
  processDuplicates, 
  runFullDeduplication,
  getDuplicateGroups 
} from './deduplication.js';

export {
  getSignificantPriceDrops,
  getUnderpricedListings,
  getStaleListings,
  getAreaPriceTrend,
  getNewListings,
  getMarketStatsByArea,
  getAgencyStats
} from './price-tracker.js';

export {
  processAlerts,
  getUserAlertTriggers
} from './alert-processor.js';
