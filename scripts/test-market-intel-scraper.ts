#!/usr/bin/env npx tsx
/**
 * Market Intelligence Scraper Test Script
 * 
 * Usage:
 *   npx tsx scripts/test-market-intel-scraper.ts [platform] [transaction]
 *   
 * Examples:
 *   npx tsx scripts/test-market-intel-scraper.ts xe_gr sale
 *   npx tsx scripts/test-market-intel-scraper.ts spitogatos rent
 *   npx tsx scripts/test-market-intel-scraper.ts tospitimou sale
 *   npx tsx scripts/test-market-intel-scraper.ts all sale
 */

import { testScraper, fetchListingsFromPlatform } from '../lib/market-intel/scraper';
import { getAllPlatformIds, getPlatformNames, getPlatformConfig } from '../lib/market-intel/platforms';

async function main() {
  const args = process.argv.slice(2);
  const platformArg = args[0] || 'all';
  const transactionType = (args[1] as 'sale' | 'rent') || 'sale';
  
  console.log('='.repeat(60));
  console.log('Market Intelligence Scraper Test');
  console.log('='.repeat(60));
  console.log(`Transaction type: ${transactionType}`);
  console.log('');
  
  const allPlatforms = getAllPlatformIds();
  const platformNames = getPlatformNames();
  
  const platformsToTest = platformArg === 'all' 
    ? allPlatforms 
    : [platformArg];
  
  // Validate platforms
  for (const p of platformsToTest) {
    if (!allPlatforms.includes(p)) {
      console.error(`Unknown platform: ${p}`);
      console.log(`Available platforms: ${allPlatforms.join(', ')}`);
      process.exit(1);
    }
  }
  
  const results: Array<{
    platform: string;
    name: string;
    success: boolean;
    listingsFound: number;
    durationMs: number;
    errors: string[];
    sampleListing?: {
      id: string;
      title: string;
      price: number | null;
      url: string;
    };
  }> = [];
  
  for (const platformId of platformsToTest) {
    console.log('-'.repeat(60));
    console.log(`Testing: ${platformNames[platformId]} (${platformId})`);
    console.log('-'.repeat(60));
    
    const startTime = Date.now();
    
    try {
      const result = await testScraper(platformId, transactionType, 10);
      const durationMs = Date.now() - startTime;
      
      results.push({
        platform: platformId,
        name: platformNames[platformId],
        success: result.success,
        listingsFound: result.listingsFound,
        durationMs,
        errors: result.errors,
        sampleListing: result.sampleListings[0] ? {
          id: result.sampleListings[0].sourceListingId,
          title: result.sampleListings[0].title || 'No title',
          price: result.sampleListings[0].price || null,
          url: result.sampleListings[0].sourceUrl
        } : undefined
      });
      
      console.log(`Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
      console.log(`Listings found: ${result.listingsFound}`);
      console.log(`Duration: ${durationMs}ms`);
      
      if (result.errors.length > 0) {
        console.log(`Errors: ${result.errors.join(', ')}`);
      }
      
      if (result.sampleListings.length > 0) {
        console.log('');
        console.log('Sample listings:');
        for (const listing of result.sampleListings.slice(0, 3)) {
          console.log(`  - [${listing.sourceListingId}] ${listing.title || 'No title'}`);
          console.log(`    Price: ${listing.price ? `€${listing.price.toLocaleString()}` : 'N/A'}`);
          console.log(`    Size: ${listing.sizeSqm ? `${listing.sizeSqm} m²` : 'N/A'}`);
          console.log(`    Location: ${listing.address || listing.area || 'N/A'}`);
          console.log(`    URL: ${listing.sourceUrl}`);
          console.log('');
        }
      }
      
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      results.push({
        platform: platformId,
        name: platformNames[platformId],
        success: false,
        listingsFound: 0,
        durationMs,
        errors: [errorMessage]
      });
      
      console.log(`Status: ❌ ERROR`);
      console.log(`Error: ${errorMessage}`);
    }
    
    console.log('');
  }
  
  // Summary
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  
  const successCount = results.filter(r => r.success).length;
  const totalListings = results.reduce((sum, r) => sum + r.listingsFound, 0);
  
  console.log(`Platforms tested: ${results.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${results.length - successCount}`);
  console.log(`Total listings found: ${totalListings}`);
  console.log('');
  
  console.log('Results by platform:');
  for (const result of results) {
    const status = result.success ? '✅' : '❌';
    console.log(`  ${status} ${result.name}: ${result.listingsFound} listings (${result.durationMs}ms)`);
    if (result.errors.length > 0) {
      console.log(`     Errors: ${result.errors.join('; ')}`);
    }
    if (result.sampleListing) {
      console.log(`     Sample: ${result.sampleListing.title} - €${result.sampleListing.price?.toLocaleString() || 'N/A'}`);
    }
  }
  
  console.log('');
  
  // Exit with error code if any platform failed
  if (successCount < results.length) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
