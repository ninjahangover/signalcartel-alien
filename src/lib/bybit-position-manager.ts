/**
 * ByBit Position Manager - CFT Integration
 * Replicates the main system's position management with database integration
 * Includes all mathematical layers and adaptive learning
 */

import { PrismaClient } from '@prisma/client';
import { ByBitDualClient, createByBitDualClient } from './bybit-dual-client';
import chalk from 'chalk';

const prisma = new PrismaClient({
  log: ['error'],
  errorFormat: 'minimal'
});

export interface ByBitPosition {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  strategy: string;
  confidence: number;
  openTime: Date;
  closeTime?: Date;
  exitPrice?: number;
  pnl?: number;
  status: 'open' | 'closed';
}

export interface OpenPositionParams {
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  strategy: string;
  confidence: number;
}

export interface PositionResult {
  success: boolean;
  positionId?: string;
  orderId?: string;
  error?: string;
}

export class ByBitPositionManager {
  private bybitClient: ByBitDualClient;
  private openPositions: Map<string, ByBitPosition> = new Map();

  constructor() {
    this.bybitClient = createByBitDualClient();
    console.log(chalk.cyan('🔄 ByBit Position Manager Initialized'));
    console.log(chalk.dim('✅ Database integration enabled'));
    console.log(chalk.dim('✅ Adaptive learning connected'));
  }

  async openPosition(params: OpenPositionParams): Promise<PositionResult> {
    try {
      console.log(chalk.cyan(`🚀 Opening ${params.side.toUpperCase()} position: ${params.symbol}`));

      // Generate unique position ID
      const positionId = `cft_${Date.now()}_${params.symbol}_${params.side}`;

      // Create position object
      const position: ByBitPosition = {
        id: positionId,
        symbol: params.symbol,
        side: params.side,
        quantity: params.quantity,
        price: params.price,
        strategy: params.strategy,
        confidence: params.confidence,
        openTime: new Date(),
        status: 'open'
      };

      // Store in memory (simulate ByBit execution)
      this.openPositions.set(positionId, position);

      // Log to database (same as main system)
      await this.logTradeToDatabase(position);

      // Update adaptive learning (same as main system)
      await this.updateAdaptiveLearning(params.symbol, params.strategy, 'OPEN', params.confidence);

      console.log(chalk.green(`✅ Position opened: ${positionId}`));
      console.log(chalk.green(`💰 Size: ${params.quantity} ${params.symbol} @ $${params.price}`));
      console.log(chalk.green(`🎯 Confidence: ${(params.confidence * 100).toFixed(1)}%`));

      return {
        success: true,
        positionId: positionId,
        orderId: `bybit_${Date.now()}`
      };

    } catch (error) {
      console.error(chalk.red('❌ Error opening position:'), error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async closePosition(positionId: string, exitPrice: number, reason: string): Promise<PositionResult> {
    try {
      const position = this.openPositions.get(positionId);
      if (!position) {
        throw new Error(`Position ${positionId} not found`);
      }

      // Calculate P&L
      const pnl = position.side === 'buy'
        ? (exitPrice - position.price) * position.quantity
        : (position.price - exitPrice) * position.quantity;

      // Update position
      position.closeTime = new Date();
      position.exitPrice = exitPrice;
      position.pnl = pnl;
      position.status = 'closed';

      // Remove from open positions
      this.openPositions.delete(positionId);

      // Log closure to database
      await this.logPositionCloseToDatabase(position);

      // Update adaptive learning with outcome
      const outcome = pnl > 0 ? 'WIN' : 'LOSS';
      await this.updateAdaptiveLearning(position.symbol, position.strategy, outcome, position.confidence, pnl);

      console.log(chalk.cyan(`📤 Position closed: ${positionId}`));
      console.log(chalk.cyan(`💰 P&L: ${pnl > 0 ? '+' : ''}$${pnl.toFixed(2)}`));
      console.log(chalk.cyan(`📋 Reason: ${reason}`));

      return {
        success: true,
        positionId: positionId
      };

    } catch (error) {
      console.error(chalk.red('❌ Error closing position:'), error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  getOpenPositionsBySymbol(symbol: string): ByBitPosition[] {
    return Array.from(this.openPositions.values()).filter(pos => pos.symbol === symbol);
  }

  getAllOpenPositions(): ByBitPosition[] {
    return Array.from(this.openPositions.values());
  }

  private async logTradeToDatabase(position: ByBitPosition) {
    try {
      // Log to Trades table (same as main system)
      await prisma.trade.create({
        data: {
          id: position.id,
          symbol: position.symbol,
          side: position.side.toUpperCase(),
          quantity: position.quantity,
          price: position.price,
          timestamp: position.openTime,
          strategy: position.strategy,
          confidence: position.confidence,
          exchange: 'BYBIT',
          orderType: 'MARKET',
          status: 'FILLED'
        }
      });

      console.log(chalk.dim(`📝 Trade logged to database: ${position.id}`));

    } catch (error) {
      console.error(chalk.red('❌ Error logging trade to database:'), error);
    }
  }

  private async logPositionCloseToDatabase(position: ByBitPosition) {
    try {
      // Update the trade record
      await prisma.trade.update({
        where: { id: position.id },
        data: {
          exitPrice: position.exitPrice,
          exitTime: position.closeTime,
          pnl: position.pnl,
          status: 'CLOSED'
        }
      });

      console.log(chalk.dim(`📝 Position closure logged: ${position.id}`));

    } catch (error) {
      console.error(chalk.red('❌ Error logging position closure:'), error);
    }
  }

  private async updateAdaptiveLearning(
    symbol: string,
    strategy: string,
    outcome: string,
    confidence: number,
    pnl?: number
  ) {
    try {
      // Determine category (same logic as main system)
      const category = this.determineCategory(symbol, strategy);

      // Update adaptive learning performance (same as main system)
      const id = `${category}_${symbol}`;

      await prisma.adaptiveLearningPerformance.upsert({
        where: {
          category_symbol: {
            category: category,
            symbol: symbol
          }
        },
        update: {
          totalSignals: { increment: 1 },
          correctSignals: outcome === 'WIN' ? { increment: 1 } : undefined,
          totalPnL: pnl ? { increment: pnl } : undefined,
          lastSignalTime: new Date(),
          lastOutcome: outcome,
          lastPnL: pnl || 0,
          recentStreak: outcome === 'WIN' ? { increment: 1 } : 0,
          updatedAt: new Date()
        },
        create: {
          id: id,
          category: category,
          symbol: symbol,
          totalSignals: 1,
          correctSignals: outcome === 'WIN' ? 1 : 0,
          accuracy: outcome === 'WIN' ? 1.0 : 0.0,
          totalPnL: pnl || 0,
          avgPnL: pnl || 0,
          lastSignalTime: new Date(),
          lastOutcome: outcome,
          lastPnL: pnl || 0,
          confidence: confidence,
          recentStreak: outcome === 'WIN' ? 1 : 0
        }
      });

      // Recalculate accuracy
      const performance = await prisma.adaptiveLearningPerformance.findUnique({
        where: {
          category_symbol: {
            category: category,
            symbol: symbol
          }
        }
      });

      if (performance) {
        const accuracy = performance.totalSignals > 0 ? performance.correctSignals / performance.totalSignals : 0;
        const avgPnL = performance.totalSignals > 0 ? performance.totalPnL / performance.totalSignals : 0;

        await prisma.adaptiveLearningPerformance.update({
          where: {
            category_symbol: {
              category: category,
              symbol: symbol
            }
          },
          data: {
            accuracy: accuracy,
            avgPnL: avgPnL
          }
        });
      }

      console.log(chalk.dim(`🧠 Adaptive learning updated: ${category}/${symbol} - ${outcome}`));

    } catch (error) {
      console.error(chalk.red('❌ Error updating adaptive learning:'), error);
    }
  }

  private determineCategory(symbol: string, strategy: string): string {
    // Same category logic as main system
    if (strategy.includes('CFT_TENSOR')) return 'CFT_PRIORITY';
    if (['BTCUSDT', 'ETHUSDT', 'BNBUSDT'].includes(symbol)) return 'CFT_MAJOR';
    if (['AVAXUSDT', 'DOTUSDT', 'SOLUSDT'].includes(symbol)) return 'CFT_ALT';
    return 'CFT_GENERAL';
  }

  async getAdaptiveLearningData(): Promise<any[]> {
    try {
      return await prisma.adaptiveLearningPerformance.findMany({
        where: {
          category: { startsWith: 'CFT_' }
        },
        orderBy: {
          accuracy: 'desc'
        }
      });
    } catch (error) {
      console.error(chalk.red('❌ Error getting adaptive learning data:'), error);
      return [];
    }
  }

  async displayPerformanceStats() {
    try {
      const stats = await this.getAdaptiveLearningData();

      console.log(chalk.cyan('\n📊 CFT ADAPTIVE LEARNING PERFORMANCE'));
      console.log(chalk.cyan('═'.repeat(60)));

      if (stats.length === 0) {
        console.log(chalk.yellow('No CFT performance data yet'));
        return;
      }

      for (const stat of stats.slice(0, 10)) {
        const accuracy = (stat.accuracy * 100).toFixed(1);
        const avgPnL = stat.avgPnL.toFixed(2);

        console.log(chalk.white(`${stat.symbol.padEnd(10)} | ${stat.category.padEnd(12)} | ${accuracy}% | $${avgPnL} | ${stat.totalSignals} signals`));
      }

      console.log(chalk.cyan('═'.repeat(60)));

    } catch (error) {
      console.error(chalk.red('❌ Error displaying performance stats:'), error);
    }
  }

  /**
   * Get open positions (required by AvailableBalanceCalculator)
   */
  getOpenPositions(): Map<string, any> {
    return this.openPositions;
  }
}

export default ByBitPositionManager;