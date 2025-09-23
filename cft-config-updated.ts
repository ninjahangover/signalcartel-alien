/**
 * CFT EVALUATION CONFIGURATIONS
 * Updated to match official specifications from cryptofundtrader.com
 */

export interface CFTEvaluationConfig {
  name: string;
  accountSize: number;
  profitTarget: number;
  profitTargetPercent: number;
  dailyLossLimit: number;
  dailyLossLimitPercent: number;
  overallLossLimit: number;
  overallLossLimitPercent: number;
  minTradingDays: number;
  maxTradingDays: number | null;
  leverage: number;
  phase?: number;
}

// 1-PHASE CHALLENGE
export const CFT_1_PHASE_CONFIG: Record<number, CFTEvaluationConfig> = {
  5000: {
    name: "1-Phase Challenge $5K",
    accountSize: 5000,
    profitTarget: 500,       // 10% of $5K
    profitTargetPercent: 10,
    dailyLossLimit: 200,     // 4% of $5K
    dailyLossLimitPercent: 4,
    overallLossLimit: 300,   // 6% of $5K
    overallLossLimitPercent: 6,
    minTradingDays: 0,
    maxTradingDays: null,    // Indefinite
    leverage: 100
  },
  10000: {
    name: "1-Phase Challenge $10K",
    accountSize: 10000,
    profitTarget: 1000,      // 10% of $10K
    profitTargetPercent: 10,
    dailyLossLimit: 400,     // 4% of $10K
    dailyLossLimitPercent: 4,
    overallLossLimit: 600,   // 6% of $10K
    overallLossLimitPercent: 6,
    minTradingDays: 0,
    maxTradingDays: null,
    leverage: 100
  },
  25000: {
    name: "1-Phase Challenge $25K",
    accountSize: 25000,
    profitTarget: 2500,      // 10% of $25K
    profitTargetPercent: 10,
    dailyLossLimit: 1000,    // 4% of $25K
    dailyLossLimitPercent: 4,
    overallLossLimit: 1500,  // 6% of $25K
    overallLossLimitPercent: 6,
    minTradingDays: 0,
    maxTradingDays: null,
    leverage: 100
  }
};

// 2-PHASE CHALLENGE
export const CFT_2_PHASE_CONFIG: Record<number, Record<number, CFTEvaluationConfig>> = {
  5000: {
    1: {
      name: "2-Phase Challenge $5K - Phase 1",
      accountSize: 5000,
      profitTarget: 400,       // 8% of $5K
      profitTargetPercent: 8,
      dailyLossLimit: 250,     // 5% of $5K
      dailyLossLimitPercent: 5,
      overallLossLimit: 500,   // 10% of $5K
      overallLossLimitPercent: 10,
      minTradingDays: 5,
      maxTradingDays: null,
      leverage: 100,
      phase: 1
    },
    2: {
      name: "2-Phase Challenge $5K - Phase 2",
      accountSize: 5000,
      profitTarget: 250,       // 5% of $5K
      profitTargetPercent: 5,
      dailyLossLimit: 250,     // 5% of $5K
      dailyLossLimitPercent: 5,
      overallLossLimit: 500,   // 10% of $5K
      overallLossLimitPercent: 10,
      minTradingDays: 5,
      maxTradingDays: null,
      leverage: 100,
      phase: 2
    }
  },
  10000: {
    1: {
      name: "2-Phase Challenge $10K - Phase 1",
      accountSize: 10000,
      profitTarget: 800,       // 8% of $10K
      profitTargetPercent: 8,
      dailyLossLimit: 500,     // 5% of $10K
      dailyLossLimitPercent: 5,
      overallLossLimit: 1000,  // 10% of $10K
      overallLossLimitPercent: 10,
      minTradingDays: 5,
      maxTradingDays: null,
      leverage: 100,
      phase: 1
    },
    2: {
      name: "2-Phase Challenge $10K - Phase 2",
      accountSize: 10000,
      profitTarget: 500,       // 5% of $10K
      profitTargetPercent: 5,
      dailyLossLimit: 500,     // 5% of $10K
      dailyLossLimitPercent: 5,
      overallLossLimit: 1000,  // 10% of $10K
      overallLossLimitPercent: 10,
      minTradingDays: 5,
      maxTradingDays: null,
      leverage: 100,
      phase: 2
    }
  },
  25000: {
    1: {
      name: "2-Phase Challenge $25K - Phase 1",
      accountSize: 25000,
      profitTarget: 2000,      // 8% of $25K
      profitTargetPercent: 8,
      dailyLossLimit: 1250,    // 5% of $25K
      dailyLossLimitPercent: 5,
      overallLossLimit: 2500,  // 10% of $25K
      overallLossLimitPercent: 10,
      minTradingDays: 5,
      maxTradingDays: null,
      leverage: 100,
      phase: 1
    },
    2: {
      name: "2-Phase Challenge $25K - Phase 2",
      accountSize: 25000,
      profitTarget: 1250,      // 5% of $25K
      profitTargetPercent: 5,
      dailyLossLimit: 1250,    // 5% of $25K
      dailyLossLimitPercent: 5,
      overallLossLimit: 2500,  // 10% of $25K
      overallLossLimitPercent: 10,
      minTradingDays: 5,
      maxTradingDays: null,
      leverage: 100,
      phase: 2
    }
  }
};

// INSTANT EVALUATION (specifications not fully detailed on site)
export const CFT_INSTANT_CONFIG: Record<number, CFTEvaluationConfig> = {
  2500: {
    name: "Instant Evaluation $2.5K",
    accountSize: 2500,
    profitTarget: 200,       // Estimated 8%
    profitTargetPercent: 8,
    dailyLossLimit: 125,     // Estimated 5%
    dailyLossLimitPercent: 5,
    overallLossLimit: 250,   // Estimated 10%
    overallLossLimitPercent: 10,
    minTradingDays: 0,
    maxTradingDays: null,
    leverage: 100
  },
  5000: {
    name: "Instant Evaluation $5K",
    accountSize: 5000,
    profitTarget: 400,       // Estimated 8%
    profitTargetPercent: 8,
    dailyLossLimit: 250,     // Estimated 5%
    dailyLossLimitPercent: 5,
    overallLossLimit: 500,   // Estimated 10%
    overallLossLimitPercent: 10,
    minTradingDays: 0,
    maxTradingDays: null,
    leverage: 100
  },
  10000: {
    name: "Instant Evaluation $10K",
    accountSize: 10000,
    profitTarget: 800,       // Estimated 8%
    profitTargetPercent: 8,
    dailyLossLimit: 500,     // Estimated 5%
    dailyLossLimitPercent: 5,
    overallLossLimit: 1000,  // Estimated 10%
    overallLossLimitPercent: 10,
    minTradingDays: 0,
    maxTradingDays: null,
    leverage: 100
  }
};

// Configuration selector
export function getCFTConfig(
  evaluationType: '1-phase' | '2-phase' | 'instant',
  accountSize: number,
  phase?: number
): CFTEvaluationConfig {
  switch (evaluationType) {
    case '1-phase':
      if (!CFT_1_PHASE_CONFIG[accountSize]) {
        throw new Error(`Account size ${accountSize} not available for 1-phase challenge`);
      }
      return CFT_1_PHASE_CONFIG[accountSize];

    case '2-phase':
      if (!phase || (phase !== 1 && phase !== 2)) {
        throw new Error('Phase must be 1 or 2 for 2-phase challenge');
      }
      if (!CFT_2_PHASE_CONFIG[accountSize]) {
        throw new Error(`Account size ${accountSize} not available for 2-phase challenge`);
      }
      return CFT_2_PHASE_CONFIG[accountSize][phase];

    case 'instant':
      if (!CFT_INSTANT_CONFIG[accountSize]) {
        throw new Error(`Account size ${accountSize} not available for instant evaluation`);
      }
      return CFT_INSTANT_CONFIG[accountSize];

    default:
      throw new Error('Invalid evaluation type');
  }
}

// Risk management helpers
export class CFTRiskManager {
  constructor(private config: CFTEvaluationConfig) {}

  checkDailyLossLimit(currentDailyLoss: number): boolean {
    return currentDailyLoss <= this.config.dailyLossLimit;
  }

  checkOverallLossLimit(totalLoss: number): boolean {
    return totalLoss <= this.config.overallLossLimit;
  }

  checkProfitTarget(currentProfit: number): boolean {
    return currentProfit >= this.config.profitTarget;
  }

  checkMinTradingDays(tradingDays: number): boolean {
    return tradingDays >= this.config.minTradingDays;
  }

  getRemainingDailyRisk(currentDailyLoss: number): number {
    return Math.max(0, this.config.dailyLossLimit - currentDailyLoss);
  }

  getRemainingOverallRisk(totalLoss: number): number {
    return Math.max(0, this.config.overallLossLimit - totalLoss);
  }

  getProgressToTarget(currentProfit: number): number {
    return (currentProfit / this.config.profitTarget) * 100;
  }

  shouldHaltTrading(currentDailyLoss: number, totalLoss: number): boolean {
    // Halt if within 0.5% of any limit for safety buffer
    const dailyBuffer = this.config.dailyLossLimit * 0.9; // 90% of limit
    const overallBuffer = this.config.overallLossLimit * 0.9; // 90% of limit

    return currentDailyLoss >= dailyBuffer || totalLoss >= overallBuffer;
  }
}

// Default configuration (most common: $10K 2-Phase)
export const DEFAULT_CFT_CONFIG = getCFTConfig('2-phase', 10000, 1);