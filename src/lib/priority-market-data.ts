/**
 * PRIORITY-BASED MARKET DATA SERVICE
 * 
 * Emergency fix for API rate limiting - prioritizes exit operations over entry operations
 * Implements intelligent caching and tiered API access controls
 */

import { rateLimitedMarketData, MarketDataPoint } from './rate-limited-market-data';

export enum DataPriority {
  CRITICAL_EXIT = 'critical_exit',        // Must have real data for exits
  NORMAL_ENTRY = 'normal_entry',         // Can use cached data for entries  
  DISCOVERY = 'discovery'                // Lowest priority - Smart Hunter scans
}

interface CachedData {
  data: MarketDataPoint;
  timestamp: number;
  usageCount: number;
}

interface PriorityRequest {
  symbol: string;
  priority: DataPriority;
  requestId: string;
  timestamp: number;
}

class PriorityMarketDataService {
  private static instance: PriorityMarketDataService;
  private cache: Map<string, CachedData> = new Map();
  private requestQueue: PriorityRequest[] = [];
  private rateLimitBudget = {
    criticalExit: 15,    // Reserve 15 calls/minute for exits
    normalEntry: 5,      // Allow 5 calls/minute for new entries
    discovery: 3         // Allow 3 calls/minute for discovery
  };
  private usedBudget = {
    criticalExit: 0,
    normalEntry: 0,
    discovery: 0
  };
  private budgetResetTime = Date.now() + 60000;
  
  // Cache duration by priority
  private readonly CACHE_DURATION = {
    [DataPriority.CRITICAL_EXIT]: 15000,   // 15 seconds for exits (fresher)
    [DataPriority.NORMAL_ENTRY]: 45000,    // 45 seconds for entries (can be older)
    [DataPriority.DISCOVERY]: 120000       // 2 minutes for discovery (oldest acceptable)
  };

  static getInstance(): PriorityMarketDataService {
    if (!PriorityMarketDataService.instance) {
      PriorityMarketDataService.instance = new PriorityMarketDataService();
    }
    return PriorityMarketDataService.instance;
  }

  /**
   * Get market data with priority-based access
   */
  async getMarketData(symbol: string, priority: DataPriority, requestId?: string): Promise<MarketDataPoint | null> {
    console.log(`📊 [PRIORITY:${priority}] Requesting ${symbol} data...`);
    
    // Reset budget if time window passed
    if (Date.now() >= this.budgetResetTime) {
      this.resetBudgets();
    }

    // Check cache first - different freshness requirements by priority
    const cached = this.getCachedData(symbol, priority);
    if (cached) {
      console.log(`✅ [CACHE] Using cached ${symbol} data (${priority})`);
      return cached;
    }

    // Check rate limit budget for this priority
    if (!this.canMakeRequest(priority)) {
      console.log(`⏳ [BUDGET] ${priority} budget exhausted, using best available cache`);
      return this.getBestAvailableCache(symbol);
    }

    // Make API request with priority
    try {
      const data = await rateLimitedMarketData.getMarketData(symbol);
      
      if (data) {
        // Cache the fresh data
        this.cache.set(symbol, {
          data,
          timestamp: Date.now(),
          usageCount: 1
        });
        
        // Consume budget
        this.consumeBudget(priority);
        
        console.log(`✅ [API:${priority}] Fresh ${symbol} data: $${data.price.toLocaleString()}`);
        return data;
      } else {
        console.log(`❌ [API] No data available for ${symbol}, checking cache only...`);
        return this.getBestAvailableCache(symbol);
      }
    } catch (error) {
      console.error(`❌ [API] Error for ${symbol}:`, error.message);
      return this.getBestAvailableCache(symbol);
    }
  }

  /**
   * Emergency method for exit operations - bypasses some restrictions
   */
  async getEmergencyExitData(symbol: string): Promise<MarketDataPoint | null> {
    console.log(`🚨 [EMERGENCY EXIT] Getting data for ${symbol}...`);
    
    // For emergency exits, even old cache is acceptable to prevent stuck positions
    const cached = this.cache.get(symbol);
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < 300000) { // 5 minutes max for emergency
        console.log(`⚡ [EMERGENCY] Using ${Math.round(age/1000)}s old data for exit`);
        return cached.data;
      }
    }

    // Try to get fresh data anyway for emergency
    return await this.getMarketData(symbol, DataPriority.CRITICAL_EXIT, 'emergency');
  }

  /**
   * Get cached data if fresh enough for the priority level
   */
  private getCachedData(symbol: string, priority: DataPriority): MarketDataPoint | null {
    const cached = this.cache.get(symbol);
    if (!cached) return null;

    const maxAge = this.CACHE_DURATION[priority];
    const age = Date.now() - cached.timestamp;

    if (age <= maxAge) {
      cached.usageCount++;
      return cached.data;
    }

    return null;
  }

  /**
   * Get best available cached data regardless of freshness (emergency fallback)
   */
  private getBestAvailableCache(symbol: string): MarketDataPoint | null {
    const cached = this.cache.get(symbol);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    
    // Only use if less than 10 minutes old (absolute max)
    if (age < 600000) {
      console.log(`⚡ [FALLBACK] Using ${Math.round(age/1000)}s old cached data`);
      return cached.data;
    }

    console.log(`❌ [CACHE] Data too old (${Math.round(age/1000)}s), rejecting`);
    return null;
  }

  /**
   * Check if we can make request within budget
   */
  private canMakeRequest(priority: DataPriority): boolean {
    switch (priority) {
      case DataPriority.CRITICAL_EXIT:
        return this.usedBudget.criticalExit < this.rateLimitBudget.criticalExit;
      case DataPriority.NORMAL_ENTRY:
        return this.usedBudget.normalEntry < this.rateLimitBudget.normalEntry;
      case DataPriority.DISCOVERY:
        return this.usedBudget.discovery < this.rateLimitBudget.discovery;
      default:
        return false;
    }
  }

  /**
   * Consume budget for priority level
   */
  private consumeBudget(priority: DataPriority): void {
    switch (priority) {
      case DataPriority.CRITICAL_EXIT:
        this.usedBudget.criticalExit++;
        break;
      case DataPriority.NORMAL_ENTRY:
        this.usedBudget.normalEntry++;
        break;
      case DataPriority.DISCOVERY:
        this.usedBudget.discovery++;
        break;
    }
  }

  /**
   * Reset rate limit budgets
   */
  private resetBudgets(): void {
    this.usedBudget = {
      criticalExit: 0,
      normalEntry: 0,
      discovery: 0
    };
    this.budgetResetTime = Date.now() + 60000;
    console.log(`🔄 [BUDGET] Rate limit budgets reset`);
  }

  /**
   * Get current status for monitoring
   */
  getStatus(): any {
    const now = Date.now();
    const budgetResetIn = Math.max(0, this.budgetResetTime - now);
    
    return {
      budgets: {
        criticalExit: {
          used: this.usedBudget.criticalExit,
          limit: this.rateLimitBudget.criticalExit,
          remaining: this.rateLimitBudget.criticalExit - this.usedBudget.criticalExit
        },
        normalEntry: {
          used: this.usedBudget.normalEntry,
          limit: this.rateLimitBudget.normalEntry,
          remaining: this.rateLimitBudget.normalEntry - this.usedBudget.normalEntry
        },
        discovery: {
          used: this.usedBudget.discovery,
          limit: this.rateLimitBudget.discovery,
          remaining: this.rateLimitBudget.discovery - this.usedBudget.discovery
        }
      },
      budgetResetIn,
      cacheSize: this.cache.size,
      cachedSymbols: Array.from(this.cache.keys())
    };
  }


  /**
   * Clear old cache entries
   */
  cleanupCache(): void {
    const now = Date.now();
    const maxAge = 600000; // 10 minutes absolute max
    
    for (const [symbol, cached] of this.cache.entries()) {
      if (now - cached.timestamp > maxAge) {
        this.cache.delete(symbol);
        console.log(`🗑️ Cleaned up old cache for ${symbol}`);
      }
    }
  }
}

export const priorityMarketData = PriorityMarketDataService.getInstance();
export { PriorityMarketDataService };