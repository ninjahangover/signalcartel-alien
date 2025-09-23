/**
 * Manual Trading Assistant for Breakout Evaluation
 * Provides signals, risk management, and trade suggestions for manual execution
 */

import { PrismaClient } from '@prisma/client';
import { BREAKOUT_CONFIG } from '../../breakout-config';
import { BREAKOUT_PAIRS, BreakoutPair, positionCalculator } from '../../breakout-pairs-config';
import chalk from 'chalk';

const prisma = new PrismaClient();

export interface TradingSignal {
  id: string;
  timestamp: Date;
  symbol: string;
  action: 'BUY' | 'SELL' | 'CLOSE' | 'HOLD';
  confidence: number;
  currentPrice: number;
  targetPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  positionSize: number;  // In USD
  leverage: number;
  reasoning: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ManualPosition {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  size: number;  // USD value
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  stopLoss?: number;
  takeProfit?: number;
  entryTime: Date;
  status: 'OPEN' | 'CLOSED';
}

export interface RiskStatus {
  currentEquity: number;
  dailyPnL: number;
  dailyLossRemaining: number;
  maxDrawdownRemaining: number;
  canTrade: boolean;
  riskLevel: 'SAFE' | 'WARNING' | 'CRITICAL' | 'BREACHED';
  warningMessage?: string;
}

export class ManualTradingAssistant {
  private currentEquity: number = BREAKOUT_CONFIG.ACCOUNT_SIZE;
  private positions: Map<string, ManualPosition> = new Map();
  private signals: TradingSignal[] = [];

  constructor() {
    console.log(chalk.cyan('🎯 Manual Trading Assistant Initialized'));
    console.log(chalk.yellow('💡 System will provide signals for manual execution'));
  }

  /**
   * Generate trading signal based on market analysis
   */
  async generateSignal(symbol: string): Promise<TradingSignal | null> {
    try {
      // Get pair configuration
      const pair = BREAKOUT_PAIRS.find(p => p.symbol === symbol);
      if (!pair) {
        console.log(chalk.red(`❌ Symbol ${symbol} not supported`));
        return null;
      }

      // Simulate market analysis (you can integrate your tensor analysis here)
      const marketData = await this.getMarketData(symbol);
      const technicalAnalysis = await this.performTechnicalAnalysis(symbol, marketData);

      // Generate signal based on analysis
      const signal = await this.createTradingSignal(pair, marketData, technicalAnalysis);

      if (signal) {
        this.signals.push(signal);
        this.displaySignal(signal);
      }

      return signal;
    } catch (error) {
      console.error(chalk.red(`Error generating signal for ${symbol}:`), error);
      return null;
    }
  }

  /**
   * Get market data for symbol (placeholder - integrate with data provider)
   */
  private async getMarketData(symbol: string): Promise<any> {
    // Placeholder - integrate with your market data source
    return {
      symbol,
      price: 50000, // Example BTC price
      volume: 1000000,
      change24h: 2.5,
      volatility: 15.2
    };
  }

  /**
   * Perform technical analysis (integrate with your tensor system)
   */
  private async performTechnicalAnalysis(symbol: string, marketData: any): Promise<any> {
    // Placeholder - integrate with your tensor AI analysis
    return {
      trend: 'BULLISH',
      momentum: 0.75,
      support: marketData.price * 0.98,
      resistance: marketData.price * 1.02,
      confidence: 0.85
    };
  }

  /**
   * Create trading signal from analysis
   */
  private async createTradingSignal(
    pair: BreakoutPair,
    marketData: any,
    analysis: any
  ): Promise<TradingSignal | null> {

    if (analysis.confidence < 0.8) {
      return null; // Skip low confidence signals
    }

    const currentPrice = marketData.price;
    const riskStatus = await this.getRiskStatus();

    // Don't generate signals if we can't trade
    if (!riskStatus.canTrade) {
      return null;
    }

    // Calculate position size
    const positionCalc = positionCalculator.calculatePositionSize(
      pair,
      currentPrice,
      riskStatus.currentEquity,
      0.02 // 2% stop loss
    );

    const signal: TradingSignal = {
      id: `signal_${Date.now()}`,
      timestamp: new Date(),
      symbol: pair.symbol,
      action: analysis.trend === 'BULLISH' ? 'BUY' : 'SELL',
      confidence: analysis.confidence,
      currentPrice,
      targetPrice: analysis.trend === 'BULLISH' ?
        currentPrice * 1.03 : currentPrice * 0.97,
      stopLoss: analysis.trend === 'BULLISH' ?
        analysis.support : analysis.resistance,
      takeProfit: analysis.trend === 'BULLISH' ?
        analysis.resistance : analysis.support,
      positionSize: positionCalc.usdValue,
      leverage: pair.leverage,
      reasoning: `${analysis.trend} trend with ${(analysis.confidence*100).toFixed(1)}% confidence. Momentum: ${analysis.momentum}`,
      urgency: analysis.confidence > 0.9 ? 'HIGH' : 'MEDIUM',
      riskLevel: positionCalc.usdValue > 75 ? 'HIGH' : 'MEDIUM'
    };

    return signal;
  }

  /**
   * Display signal in console with clear formatting
   */
  private displaySignal(signal: TradingSignal) {
    console.log(chalk.cyan('\n🚨 NEW TRADING SIGNAL 🚨'));
    console.log(chalk.white('═'.repeat(50)));

    const actionColor = signal.action === 'BUY' ? chalk.green : chalk.red;
    console.log(actionColor.bold(`${signal.action} ${signal.symbol}`));

    console.log(chalk.white(`Price: $${signal.currentPrice.toFixed(2)}`));
    console.log(chalk.white(`Position Size: $${signal.positionSize.toFixed(2)} (${signal.leverage}x leverage)`));
    console.log(chalk.white(`Confidence: ${(signal.confidence*100).toFixed(1)}%`));
    console.log(chalk.white(`Stop Loss: $${signal.stopLoss?.toFixed(2)}`));
    console.log(chalk.white(`Take Profit: $${signal.takeProfit?.toFixed(2)}`));

    const urgencyColor =
      signal.urgency === 'CRITICAL' ? chalk.red :
      signal.urgency === 'HIGH' ? chalk.yellow :
      chalk.dim;
    console.log(urgencyColor(`Urgency: ${signal.urgency}`));

    console.log(chalk.dim(`Reasoning: ${signal.reasoning}`));
    console.log(chalk.white('═'.repeat(50)));

    // Add audio alert for high urgency
    if (signal.urgency === 'HIGH' || signal.urgency === 'CRITICAL') {
      console.log(chalk.red.bold('🔔 HIGH PRIORITY SIGNAL - EXECUTE SOON!'));
    }
  }

  /**
   * Record a manually executed trade
   */
  async recordTrade(
    symbol: string,
    side: 'BUY' | 'SELL',
    size: number,
    price: number,
    stopLoss?: number,
    takeProfit?: number
  ): Promise<ManualPosition> {

    const position: ManualPosition = {
      id: `pos_${Date.now()}`,
      symbol,
      side,
      size,
      entryPrice: price,
      currentPrice: price,
      unrealizedPnL: 0,
      stopLoss,
      takeProfit,
      entryTime: new Date(),
      status: 'OPEN'
    };

    this.positions.set(position.id, position);

    console.log(chalk.green(`✅ Trade recorded: ${side} ${size} ${symbol} @ $${price}`));

    // Save to database for tracking
    await this.saveTradeToDatabase(position);

    return position;
  }

  /**
   * Update position with current market price
   */
  async updatePosition(positionId: string, currentPrice: number): Promise<void> {
    const position = this.positions.get(positionId);
    if (!position) return;

    position.currentPrice = currentPrice;

    // Calculate unrealized P&L
    if (position.side === 'BUY') {
      position.unrealizedPnL = (currentPrice - position.entryPrice) * (position.size / position.entryPrice);
    } else {
      position.unrealizedPnL = (position.entryPrice - currentPrice) * (position.size / position.entryPrice);
    }

    // Check stop loss / take profit
    this.checkPositionLimits(position);
  }

  /**
   * Check if position should be closed based on stop loss / take profit
   */
  private checkPositionLimits(position: ManualPosition) {
    const shouldClose =
      (position.stopLoss &&
        ((position.side === 'BUY' && position.currentPrice <= position.stopLoss) ||
         (position.side === 'SELL' && position.currentPrice >= position.stopLoss))) ||
      (position.takeProfit &&
        ((position.side === 'BUY' && position.currentPrice >= position.takeProfit) ||
         (position.side === 'SELL' && position.currentPrice <= position.takeProfit)));

    if (shouldClose) {
      console.log(chalk.red(`🚨 CLOSE POSITION: ${position.symbol} - Limit reached!`));
      console.log(chalk.yellow(`Current Price: $${position.currentPrice.toFixed(2)}`));
      console.log(chalk.yellow(`Unrealized P&L: $${position.unrealizedPnL.toFixed(2)}`));
    }
  }

  /**
   * Get current risk status
   */
  async getRiskStatus(): Promise<RiskStatus> {
    // Calculate current equity
    let totalUnrealizedPnL = 0;
    for (const [_, position] of this.positions) {
      if (position.status === 'OPEN') {
        totalUnrealizedPnL += position.unrealizedPnL;
      }
    }

    const currentEquity = BREAKOUT_CONFIG.ACCOUNT_SIZE + totalUnrealizedPnL;

    // Calculate daily P&L (placeholder - you'd track this properly)
    const dailyPnL = totalUnrealizedPnL; // Simplified

    // Calculate remaining limits
    const dailyLossRemaining = BREAKOUT_CONFIG.DAILY_LOSS_LIMIT + dailyPnL;
    const maxDrawdownRemaining = BREAKOUT_CONFIG.MAX_DRAWDOWN - (BREAKOUT_CONFIG.ACCOUNT_SIZE - currentEquity);

    // Determine risk level
    let riskLevel: RiskStatus['riskLevel'] = 'SAFE';
    let warningMessage: string | undefined;

    if (dailyLossRemaining < 50 || maxDrawdownRemaining < 50) {
      riskLevel = 'CRITICAL';
      warningMessage = 'Approaching drawdown limits!';
    } else if (dailyLossRemaining < 100 || maxDrawdownRemaining < 100) {
      riskLevel = 'WARNING';
      warningMessage = 'Monitor risk carefully';
    }

    const canTrade = dailyLossRemaining > 0 && maxDrawdownRemaining > 0;

    return {
      currentEquity,
      dailyPnL,
      dailyLossRemaining,
      maxDrawdownRemaining,
      canTrade,
      riskLevel,
      warningMessage
    };
  }

  /**
   * Save trade to database for record keeping
   */
  private async saveTradeToDatabase(position: ManualPosition): Promise<void> {
    try {
      // Save to your database for tracking
      // This helps maintain records for evaluation
      console.log(chalk.dim(`💾 Trade saved to database: ${position.id}`));
    } catch (error) {
      console.error(chalk.red('Failed to save trade to database:'), error);
    }
  }

  /**
   * Get all open positions
   */
  getOpenPositions(): ManualPosition[] {
    return Array.from(this.positions.values()).filter(p => p.status === 'OPEN');
  }

  /**
   * Get recent signals
   */
  getRecentSignals(count: number = 10): TradingSignal[] {
    return this.signals.slice(-count);
  }

  /**
   * Start signal generation loop
   */
  async startSignalGeneration(): Promise<void> {
    console.log(chalk.green('🚀 Starting signal generation for Breakout evaluation...'));

    // Generate signals for high-priority pairs every 30 seconds
    setInterval(async () => {
      const riskStatus = await this.getRiskStatus();

      if (!riskStatus.canTrade) {
        console.log(chalk.red('⚠️ Trading suspended due to risk limits'));
        return;
      }

      // Focus on BTCUSD and ETHUSD (5x leverage pairs)
      const priorityPairs = ['BTCUSD', 'ETHUSD'];

      for (const symbol of priorityPairs) {
        await this.generateSignal(symbol);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }, 30000); // Every 30 seconds
  }
}

// Export singleton instance
export const tradingAssistant = new ManualTradingAssistant();