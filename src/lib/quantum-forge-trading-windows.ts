/**
 * QUANTUM FORGE™ Trading Windows Manager
 * 
 * Optimizes trading based on global market sessions and liquidity patterns
 * Weekends are generally avoided due to low liquidity and unpredictable movements
 */

// Using console for logging - no separate logger module needed

interface TradingSession {
  name: string;
  start: number; // Hour in UTC
  end: number;   // Hour in UTC
  quality: 'excellent' | 'good' | 'moderate' | 'poor';
  multiplier: number; // Position size multiplier
  description: string;
}

interface MarketConditionOverride {
  reason: string;
  allowTrading: boolean;
  riskMultiplier: number;
}

export class TradingWindowManager {
  // Trading sessions in UTC
  private readonly sessions: TradingSession[] = [
    {
      name: 'Asia Prime',
      start: 0,  // 00:00 UTC (9 AM Tokyo)
      end: 8,    // 08:00 UTC (5 PM Tokyo)
      quality: 'excellent',
      multiplier: 1.0,
      description: 'High liquidity from Asian markets, especially crypto-friendly regions'
    },
    {
      name: 'Europe Open',
      start: 7,  // 07:00 UTC (8 AM London)
      end: 9,    // 09:00 UTC (10 AM London)
      quality: 'excellent',
      multiplier: 1.2,
      description: 'Europe open overlap with Asia - maximum liquidity'
    },
    {
      name: 'Europe Prime',
      start: 9,  // 09:00 UTC
      end: 16,   // 16:00 UTC (5 PM London)
      quality: 'good',
      multiplier: 1.0,
      description: 'Strong European trading session'
    },
    {
      name: 'US Open',
      start: 13, // 13:00 UTC (9 AM EST)
      end: 15,   // 15:00 UTC (11 AM EST)
      quality: 'excellent',
      multiplier: 1.15,
      description: 'US market open with Europe overlap'
    },
    {
      name: 'US Prime',
      start: 15, // 15:00 UTC
      end: 21,   // 21:00 UTC (5 PM EST)
      quality: 'good',
      multiplier: 0.95,
      description: 'Active US trading session'
    },
    {
      name: 'US Close',
      start: 21, // 21:00 UTC
      end: 23,   // 23:00 UTC
      quality: 'moderate',
      multiplier: 0.8,
      description: 'US winding down, Asia preparing'
    },
    {
      name: 'Twilight Zone',
      start: 23, // 23:00 UTC
      end: 0,    // 00:00 UTC (wraps to next day)
      quality: 'moderate',
      multiplier: 0.7,
      description: 'Transition period, lower liquidity'
    }
  ];

  // Weekend trading restrictions
  private readonly weekendRestrictions = {
    friday: {
      startRestriction: 21, // UTC - Start reducing after US close
      multiplier: 0.7
    },
    saturday: {
      allowTrading: false, // Generally avoid Saturday
      emergencyOnly: true,
      multiplier: 0.3
    },
    sunday: {
      startTrading: 17, // UTC (1 AM Monday Hong Kong)
      multiplier: 0.8,
      description: 'Asia Monday morning opening'
    }
  };

  /**
   * Get current trading window and quality
   */
  getCurrentWindow(): { session: TradingSession | null; override?: MarketConditionOverride } {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 6 = Saturday
    
    // Check weekend overrides first
    const weekendOverride = this.checkWeekendRestrictions(dayOfWeek, utcHour);
    if (weekendOverride) {
      return { session: null, override: weekendOverride };
    }

    // Find active session
    const activeSession = this.sessions.find(session => {
      if (session.end > session.start) {
        return utcHour >= session.start && utcHour < session.end;
      } else {
        // Handles wrap-around (e.g., 23:00 - 00:00)
        return utcHour >= session.start || utcHour < session.end;
      }
    });

    return { session: activeSession || null };
  }

  /**
   * Check weekend trading restrictions
   */
  private checkWeekendRestrictions(dayOfWeek: number, utcHour: number): MarketConditionOverride | null {
    // Saturday - heavily restricted
    if (dayOfWeek === 6) {
      return {
        reason: 'Saturday - Extremely low liquidity, high manipulation risk',
        allowTrading: false,
        riskMultiplier: this.weekendRestrictions.saturday.multiplier
      };
    }

    // Friday evening - start restrictions
    if (dayOfWeek === 5 && utcHour >= this.weekendRestrictions.friday.startRestriction) {
      return {
        reason: 'Friday evening - Liquidity dropping for weekend',
        allowTrading: true,
        riskMultiplier: this.weekendRestrictions.friday.multiplier
      };
    }

    // Sunday - restricted until Asia opens
    if (dayOfWeek === 0 && utcHour < this.weekendRestrictions.sunday.startTrading) {
      return {
        reason: 'Sunday - Waiting for Asia Monday open',
        allowTrading: false,
        riskMultiplier: 0.4
      };
    }

    // Sunday evening (Asia Monday morning) - gradual opening
    if (dayOfWeek === 0 && utcHour >= this.weekendRestrictions.sunday.startTrading) {
      return {
        reason: 'Asia Monday opening - Liquidity returning',
        allowTrading: true,
        riskMultiplier: this.weekendRestrictions.sunday.multiplier
      };
    }

    return null;
  }

  /**
   * Calculate trading quality score for current time
   */
  getTradingQualityScore(): number {
    const { session, override } = this.getCurrentWindow();
    
    if (override && !override.allowTrading) {
      return 0;
    }

    if (override) {
      return override.riskMultiplier;
    }

    if (!session) {
      return 0.5; // Default if no session found
    }

    const qualityScores = {
      excellent: 1.0,
      good: 0.85,
      moderate: 0.65,
      poor: 0.4
    };

    return qualityScores[session.quality];
  }

  /**
   * Get position size multiplier based on trading window
   */
  getPositionSizeMultiplier(): number {
    const { session, override } = this.getCurrentWindow();
    
    if (override) {
      return override.riskMultiplier;
    }

    return session?.multiplier || 0.5;
  }

  /**
   * Check if trading is allowed at current time
   */
  isTradingAllowed(): { allowed: boolean; reason: string; quality: number } {
    const { session, override } = this.getCurrentWindow();
    const now = new Date();
    
    if (override) {
      return {
        allowed: override.allowTrading,
        reason: override.reason,
        quality: override.riskMultiplier
      };
    }

    if (!session) {
      return {
        allowed: true, // Allow but with reduced size
        reason: 'Outside prime sessions - reduced position size',
        quality: 0.5
      };
    }

    const localTime = now.toLocaleString('en-US', { 
      timeZone: 'UTC',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false 
    });

    return {
      allowed: true,
      reason: `${session.name} session active (${localTime} UTC) - ${session.description}`,
      quality: this.getTradingQualityScore()
    };
  }

  /**
   * Get recommended trading parameters for current window
   */
  getWindowParameters(): {
    maxPositions: number;
    confidenceThreshold: number;
    stopLossMultiplier: number;
    takeProfitMultiplier: number;
  } {
    const quality = this.getTradingQualityScore();
    
    // Adjust parameters based on market quality
    return {
      maxPositions: Math.floor(10 * quality), // 0-10 positions
      confidenceThreshold: 0.5 + (0.3 * (1 - quality)), // 50-80% required
      stopLossMultiplier: 1 + (0.5 * (1 - quality)), // Tighter stops in poor conditions
      takeProfitMultiplier: 1 - (0.2 * (1 - quality)) // Quicker profits in poor conditions
    };
  }

  /**
   * Get next optimal trading window
   */
  getNextOptimalWindow(): { time: Date; session: TradingSession; hoursUntil: number } {
    const now = new Date();
    const currentHour = now.getUTCHours();
    const dayOfWeek = now.getUTCDay();
    
    // Find next excellent quality session
    const excellentSessions = this.sessions.filter(s => s.quality === 'excellent');
    
    for (let hoursAhead = 1; hoursAhead <= 24; hoursAhead++) {
      const futureHour = (currentHour + hoursAhead) % 24;
      const futureDay = (dayOfWeek + Math.floor((currentHour + hoursAhead) / 24)) % 7;
      
      // Skip Saturday entirely and Sunday morning
      if (futureDay === 6) continue;
      if (futureDay === 0 && futureHour < this.weekendRestrictions.sunday.startTrading) continue;
      
      const matchingSession = excellentSessions.find(session => {
        if (session.end > session.start) {
          return futureHour >= session.start && futureHour < session.end;
        } else {
          return futureHour >= session.start || futureHour < session.end;
        }
      });
      
      if (matchingSession) {
        const futureTime = new Date(now);
        futureTime.setUTCHours(futureTime.getUTCHours() + hoursAhead);
        
        return {
          time: futureTime,
          session: matchingSession,
          hoursUntil: hoursAhead
        };
      }
    }
    
    // Fallback to first excellent session
    return {
      time: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      session: excellentSessions[0],
      hoursUntil: 24
    };
  }

  /**
   * Log current trading window status
   */
  logWindowStatus(): void {
    const { allowed, reason, quality } = this.isTradingAllowed();
    const params = this.getWindowParameters();
    const nextOptimal = this.getNextOptimalWindow();
    
    const statusEmoji = allowed ? (quality > 0.8 ? '🟢' : '🟡') : '🔴';
    
    console.log(`${statusEmoji} Trading Window Status`, {
      allowed,
      reason,
      quality: (quality * 100).toFixed(0) + '%',
      maxPositions: params.maxPositions,
      confidenceRequired: (params.confidenceThreshold * 100).toFixed(0) + '%',
      nextOptimalWindow: `${nextOptimal.session.name} in ${nextOptimal.hoursUntil}h`
    });
  }
}

export const tradingWindowManager = new TradingWindowManager();