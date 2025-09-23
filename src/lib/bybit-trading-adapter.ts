/**
 * ByBit Trading Adapter for CFT Evaluation
 * Adapts SignalCartel system to work with ByBit API
 */

import { ByBitDualClient, createByBitDualClient } from './bybit-dual-client';
import { dynamicLeverageCalculator, LeverageDecision } from './dynamic-leverage-calculator';
import { realTimeRegimeMonitor } from './real-time-regime-monitor';
import { PrismaClient } from '@prisma/client';
import chalk from 'chalk';

const prisma = new PrismaClient();

export interface TradeSignal {
  symbol: string;
  side: 'Buy' | 'Sell';
  positionSizeUSD: number;
  currentPrice: number;
  stopLoss: number;
  takeProfit: number;
  conviction: number;
  timestamp: Date;
}

export interface PositionData {
  symbol: string;
  side: 'Buy' | 'Sell';
  size: string;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  isOpen: boolean;
}

export class ByBitTradingAdapter {
  private bybitClient: ByBitDualClient;
  private isEnabled: boolean = true;
  private maxPositionSizeUSD: number = 1000; // Max $1000 per position for $10k account
  private maxDailyRiskUSD: number = 500;     // Max $500 daily risk
  private currentDailyRisk: number = 0;

  constructor() {
    this.bybitClient = createByBitDualClient();

    console.log(chalk.cyan('🔄 ByBit Trading Adapter Initialized'));
    console.log(chalk.dim(`Max Position: $${this.maxPositionSizeUSD}`));
    console.log(chalk.dim(`Max Daily Risk: $${this.maxDailyRiskUSD}`));
  }

  /**
   * Test connection to ByBit (safe, no trades)
   */
  async testConnection(): Promise<boolean> {
    try {
      const status = this.bybitClient.getStatus();
      console.log(chalk.cyan('📊 ByBit Connection Status:'));
      console.log(chalk.green(`✅ Public API: ${status.publicAPI ? 'Available' : 'Unavailable'}`));
      console.log(status.cftAPI ?
        chalk.green('✅ CFT API: Trade execution ready') :
        chalk.yellow('⚠️  CFT API: IP whitelist pending')
      );

      // Test public API with a simple market data call
      const price = await this.bybitClient.getMarketPrice('BTCUSDT');
      console.log(chalk.green(`✅ Market data test: BTC @ $${price.toFixed(2)}`));

      return true; // Return true if at least public API works
    } catch (error) {
      console.error(chalk.red('ByBit connection test failed:'), error);
      return false;
    }
  }

  /**
   * Get current account status
   */
  async getAccountStatus() {
    try {
      const summary = await this.bybitClient.getAccountSummary();
      const positions = await this.getOpenPositions();

      return {
        totalEquity: summary.totalEquity,
        availableBalance: summary.availableBalance,
        unrealizedPnl: summary.totalUnrealizedPnl,
        openPositions: positions.length,
        canTrade: this.isEnabled && summary.availableBalance > 100 // Min $100 for new trades
      };
    } catch (error) {
      console.error(chalk.red('Failed to get account status:'), error);
      return null;
    }
  }

  /**
   * Get all open positions
   */
  async getOpenPositions(): Promise<PositionData[]> {
    try {
      const positions = await this.bybitClient.getPositions();

      return positions
        .filter(p => parseFloat(p.size) > 0)
        .map(p => ({
          symbol: p.symbol,
          side: p.side,
          size: p.size,
          entryPrice: parseFloat(p.entryPrice),
          markPrice: parseFloat(p.markPrice),
          unrealizedPnl: parseFloat(p.unrealisedPnl),
          isOpen: true
        }));
    } catch (error) {
      console.error(chalk.red('Failed to get positions:'), error);
      return [];
    }
  }

  /**
   * Execute a trade signal on ByBit with dynamic leverage
   */
  async executeTradeSignal(signal: TradeSignal): Promise<boolean> {
    if (!this.isEnabled) {
      console.log(chalk.yellow('Trading disabled - skipping signal'));
      return false;
    }

    try {
      // Calculate optimal leverage using mathematical algorithms
      const regimeContext = await realTimeRegimeMonitor.getCurrentRegime(signal.symbol);
      const leverageDecision = await dynamicLeverageCalculator.calculateOptimalLeverage(
        signal.symbol,
        signal.currentPrice,
        signal.stopLoss,
        signal.takeProfit,
        signal.conviction,
        regimeContext
      );

      // Validate signal
      const validation = await this.validateTradeSignal(signal);
      if (!validation.isValid) {
        console.log(chalk.red('Trade signal validation failed:'));
        validation.reasons.forEach(reason => {
          console.log(chalk.red(`  • ${reason}`));
        });
        return false;
      }

      // Set leverage on ByBit before placing order
      const leverageSet = await this.bybitClient.setLeverage(signal.symbol, leverageDecision.leverage);
      if (!leverageSet) {
        console.log(chalk.red(`Failed to set leverage ${leverageDecision.leverage}x for ${signal.symbol}`));
        return false;
      }

      // Calculate position size with leverage consideration
      const positionInfo = await this.calculatePositionSizeWithLeverage(signal, leverageDecision);
      if (!positionInfo) {
        console.log(chalk.red('Failed to calculate position size with leverage'));
        return false;
      }

      console.log(chalk.cyan('🎯 EXECUTING LEVERAGED TRADE SIGNAL'));
      console.log(chalk.white('═'.repeat(50)));
      console.log(chalk.white(`Symbol: ${signal.symbol}`));
      console.log(chalk.white(`Side: ${signal.side}`));
      console.log(chalk.magenta(`🔧 Dynamic Leverage: ${leverageDecision.leverage}x`));
      console.log(chalk.magenta(`📊 Leverage Confidence: ${(leverageDecision.confidence * 100).toFixed(1)}%`));
      console.log(chalk.white(`Size: ${positionInfo.quantity} (${positionInfo.sizeUSD} USD)`));
      console.log(chalk.white(`Effective Position: $${(positionInfo.sizeUSD * leverageDecision.leverage).toFixed(2)}`));
      console.log(chalk.white(`Price: $${signal.currentPrice.toFixed(2)}`));
      console.log(chalk.white(`Stop Loss: $${signal.stopLoss.toFixed(2)}`));
      console.log(chalk.white(`Take Profit: $${signal.takeProfit.toFixed(2)}`));
      console.log(chalk.white(`AI Conviction: ${(signal.conviction * 100).toFixed(1)}%`));

      // Display leverage reasoning
      console.log(chalk.cyan('🧠 Leverage Reasoning:'));
      leverageDecision.reasoning.forEach(reason => {
        console.log(chalk.dim(`  • ${reason}`));
      });

      // Place the order
      const order = await this.bybitClient.placeMarketOrder(
        signal.symbol,
        signal.side,
        positionInfo.quantity.toString(),
        {
          stopLoss: signal.stopLoss.toString(),
          takeProfit: signal.takeProfit.toString(),
          orderLinkId: `CFT_${Date.now()}`
        }
      );

      // Record in database with leverage information
      await this.recordTradeWithLeverage(signal, order, positionInfo, leverageDecision);

      // Update risk tracking
      this.currentDailyRisk += positionInfo.riskAmount;

      console.log(chalk.green(`✅ Trade executed successfully: ${order.orderId}`));
      return true;

    } catch (error: any) {
      console.error(chalk.red('Failed to execute trade:'), error.message);

      // Record failed trade for analysis
      await this.recordFailedTrade(signal, error.message);

      return false;
    }
  }

  /**
   * Validate trade signal before execution
   */
  private async validateTradeSignal(signal: TradeSignal): Promise<{
    isValid: boolean;
    reasons: string[];
  }> {
    const reasons: string[] = [];
    let isValid = true;

    // Check if trading is enabled
    if (!this.isEnabled) {
      isValid = false;
      reasons.push('Trading is disabled');
    }

    // Check conviction threshold
    if (signal.conviction < 0.85) {
      isValid = false;
      reasons.push(`Low conviction: ${(signal.conviction * 100).toFixed(1)}% (min 85%)`);
    }

    // Check account status
    const accountStatus = await this.getAccountStatus();
    if (!accountStatus?.canTrade) {
      isValid = false;
      reasons.push('Account cannot trade (insufficient balance or connection issue)');
    }

    // Check daily risk limit
    const estimatedRisk = signal.positionSizeUSD * 0.02; // Assume 2% risk
    if (this.currentDailyRisk + estimatedRisk > this.maxDailyRiskUSD) {
      isValid = false;
      reasons.push(`Daily risk limit exceeded: $${(this.currentDailyRisk + estimatedRisk).toFixed(2)} > $${this.maxDailyRiskUSD}`);
    }

    // Check position size limit
    if (signal.positionSizeUSD > this.maxPositionSizeUSD) {
      isValid = false;
      reasons.push(`Position too large: $${signal.positionSizeUSD} > $${this.maxPositionSizeUSD}`);
    }

    // Check if pair exists
    const currentPrice = await this.bybitClient.getMarketPrice(signal.symbol);
    if (!currentPrice) {
      isValid = false;
      reasons.push(`Invalid symbol: ${signal.symbol}`);
    }

    return { isValid, reasons };
  }

  /**
   * Calculate position size based on account balance and risk
   */
  private async calculatePositionSize(signal: TradeSignal): Promise<{
    quantity: number;
    sizeUSD: number;
    riskAmount: number;
  } | null> {
    try {
      const accountStatus = await this.getAccountStatus();
      if (!accountStatus) return null;

      // Use smaller of signal size or max position size
      const targetSizeUSD = Math.min(signal.positionSizeUSD, this.maxPositionSizeUSD);

      // Calculate quantity based on current price
      const quantity = targetSizeUSD / signal.currentPrice;

      // Calculate risk amount based on stop loss
      const stopDistance = Math.abs(signal.currentPrice - signal.stopLoss);
      const riskAmount = (stopDistance / signal.currentPrice) * targetSizeUSD;

      return {
        quantity,
        sizeUSD: targetSizeUSD,
        riskAmount
      };
    } catch (error) {
      console.error('Error calculating position size:', error);
      return null;
    }
  }

  /**
   * Record successful trade in database
   */
  private async recordTrade(
    signal: TradeSignal,
    order: any,
    positionInfo: { quantity: number; sizeUSD: number; riskAmount: number }
  ) {
    try {
      await prisma.position.create({
        data: {
          exchange: 'BYBIT_CFT',
          symbol: signal.symbol,
          side: signal.side,
          quantity: positionInfo.quantity,
          entryPrice: signal.currentPrice,
          currentPrice: signal.currentPrice,
          stopLoss: signal.stopLoss,
          takeProfit: signal.takeProfit,
          positionSize: positionInfo.sizeUSD,
          status: 'OPEN',
          orderId: order.orderId,
          conviction: signal.conviction,
          riskAmount: positionInfo.riskAmount,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      console.log(chalk.green('✅ Trade recorded in database'));
    } catch (error) {
      console.error('Error recording trade:', error);
    }
  }

  /**
   * Record failed trade for analysis
   */
  private async recordFailedTrade(signal: TradeSignal, error: string) {
    try {
      await prisma.failedTrade.create({
        data: {
          exchange: 'BYBIT_CFT',
          symbol: signal.symbol,
          side: signal.side,
          reason: error,
          conviction: signal.conviction,
          positionSize: signal.positionSizeUSD,
          timestamp: new Date()
        }
      });
    } catch (dbError) {
      console.error('Error recording failed trade:', dbError);
    }
  }

  /**
   * Close all positions (emergency stop)
   */
  async emergencyCloseAll(): Promise<boolean> {
    try {
      console.log(chalk.red('🚨 EMERGENCY CLOSE ALL POSITIONS'));

      const result = await this.bybitClient.emergencyCloseAll();

      if (result) {
        // Update database positions
        await prisma.position.updateMany({
          where: {
            status: 'OPEN',
            exchange: 'BYBIT_CFT'
          },
          data: {
            status: 'CLOSED_EMERGENCY',
            updatedAt: new Date()
          }
        });
      }

      return result;
    } catch (error) {
      console.error('Emergency close failed:', error);
      return false;
    }
  }

  /**
   * Update positions with current market data
   */
  async updatePositions() {
    try {
      const openPositions = await this.getOpenPositions();

      for (const position of openPositions) {
        await prisma.position.updateMany({
          where: {
            symbol: position.symbol,
            status: 'OPEN',
            exchange: 'BYBIT_CFT'
          },
          data: {
            currentPrice: position.markPrice,
            unrealizedPnL: position.unrealizedPnl,
            updatedAt: new Date()
          }
        });
      }

      console.log(chalk.dim(`Updated ${openPositions.length} positions`));
    } catch (error) {
      console.error('Error updating positions:', error);
    }
  }

  /**
   * Enable/disable trading
   */
  setTradingEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    console.log(chalk.cyan(`Trading ${enabled ? 'ENABLED' : 'DISABLED'}`));
  }

  /**
   * Reset daily risk tracking (call at start of new day)
   */
  resetDailyRisk() {
    this.currentDailyRisk = 0;
    console.log(chalk.blue('📅 Daily risk reset'));
  }

  /**
   * Calculate position size with leverage consideration
   */
  private async calculatePositionSizeWithLeverage(signal: TradeSignal, leverageDecision: LeverageDecision): Promise<{
    quantity: number;
    sizeUSD: number;
    riskAmount: number;
    leverageUsed: number;
    effectiveExposure: number;
  } | null> {
    try {
      const accountStatus = await this.getAccountStatus();
      if (!accountStatus) return null;

      // Base position size (without leverage multiplier)
      const baseSizeUSD = Math.min(signal.positionSizeUSD, this.maxPositionSizeUSD);

      // Apply leverage to get effective exposure
      const effectiveExposure = baseSizeUSD * leverageDecision.leverage;

      // But actual margin requirement is just the base size
      const actualMarginRequired = baseSizeUSD;

      // Calculate quantity based on current price (this is the actual contract quantity)
      const quantity = effectiveExposure / signal.currentPrice;

      // Calculate risk amount based on stop loss (on the full leveraged position)
      const stopDistance = Math.abs(signal.currentPrice - signal.stopLoss);
      const riskAmount = (stopDistance / signal.currentPrice) * effectiveExposure;

      // Ensure we don't exceed CFT risk limits even with leverage
      const maxRiskWithLeverage = this.maxPositionSizeUSD * 0.02; // 2% max risk
      if (riskAmount > maxRiskWithLeverage) {
        console.log(chalk.yellow(`⚠️ Reducing position size due to leverage risk: $${riskAmount.toFixed(2)} > $${maxRiskWithLeverage.toFixed(2)}`));

        // Reduce position to meet risk limits
        const adjustmentFactor = maxRiskWithLeverage / riskAmount;
        const adjustedQuantity = quantity * adjustmentFactor;
        const adjustedSizeUSD = actualMarginRequired * adjustmentFactor;
        const adjustedEffectiveExposure = adjustedSizeUSD * leverageDecision.leverage;

        return {
          quantity: adjustedQuantity,
          sizeUSD: adjustedSizeUSD,
          riskAmount: maxRiskWithLeverage,
          leverageUsed: leverageDecision.leverage,
          effectiveExposure: adjustedEffectiveExposure
        };
      }

      return {
        quantity,
        sizeUSD: actualMarginRequired, // Margin required (not the full exposure)
        riskAmount,
        leverageUsed: leverageDecision.leverage,
        effectiveExposure // Full position value
      };

    } catch (error) {
      console.error(chalk.red('Error calculating leveraged position size:'), error);
      return null;
    }
  }

  /**
   * Record trade with leverage information
   */
  private async recordTradeWithLeverage(
    signal: TradeSignal,
    order: any,
    positionInfo: any,
    leverageDecision: LeverageDecision
  ): Promise<void> {
    try {
      await prisma.trade.create({
        data: {
          symbol: signal.symbol,
          side: signal.side,
          quantity: positionInfo.quantity,
          price: signal.currentPrice,
          stopLoss: signal.stopLoss,
          takeProfit: signal.takeProfit,
          positionSizeUSD: positionInfo.sizeUSD,
          effectiveExposure: positionInfo.effectiveExposure,
          leverage: leverageDecision.leverage,
          leverageConfidence: leverageDecision.confidence,
          leverageReasoning: JSON.stringify(leverageDecision.reasoning),
          aiConfidence: signal.conviction,
          riskAmount: positionInfo.riskAmount,
          orderId: order.orderId,
          status: 'OPEN',
          timestamp: signal.timestamp,
          exchange: 'BYBIT_CFT'
        }
      });

      console.log(chalk.green(`✅ Leveraged trade recorded: ${signal.symbol} ${leverageDecision.leverage}x`));
    } catch (error) {
      console.error(chalk.red('Failed to record leveraged trade:'), error);
    }
  }

  /**
   * Get current trading status
   */
  getTradingStatus() {
    return {
      isEnabled: this.isEnabled,
      currentDailyRisk: this.currentDailyRisk,
      maxDailyRisk: this.maxDailyRiskUSD,
      maxPositionSize: this.maxPositionSizeUSD,
      dailyRiskRemaining: this.maxDailyRiskUSD - this.currentDailyRisk
    };
  }
}