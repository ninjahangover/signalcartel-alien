// Production Telemetry - Simple logging and basic monitoring
// This works around OpenTelemetry version conflicts while providing observability

interface TelemetryConfig {
  serviceName: string;
  environment: string;
  externalMonitoringServer?: string;
}

class ProductionTelemetry {
  private config: TelemetryConfig;
  
  constructor(config: TelemetryConfig) {
    this.config = config;
    console.log(`📊 Production Telemetry initialized for ${config.serviceName}`);
    if (config.externalMonitoringServer) {
      console.log(`🔗 External monitoring configured: ${config.externalMonitoringServer}`);
    }
  }

  // Trading Events
  trackTrade(data: {
    strategy: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    amount: number;
    price: number;
    success: boolean;
    pnl?: number;
    confidence?: number;
  }) {
    const timestamp = new Date().toISOString();
    console.log(`📊 TRADE [${timestamp}] ${data.strategy} ${data.side} ${data.symbol} - ${data.amount} @ $${data.price} - ${data.success ? 'SUCCESS' : 'FAILED'}${data.pnl ? ` - PnL: $${data.pnl.toFixed(2)}` : ''}${data.confidence ? ` - Confidence: ${(data.confidence * 100).toFixed(1)}%` : ''}`);
  }

  // AI System Events
  trackAI(data: {
    system: string;
    responseTime: number;
    confidence: number;
    sentiment?: number;
    prediction?: string;
    success: boolean;
  }) {
    const timestamp = new Date().toISOString();
    console.log(`🧠 AI [${timestamp}] ${data.system} - ${data.responseTime}ms - ${(data.confidence * 100).toFixed(1)}% confidence${data.sentiment ? ` - sentiment: ${data.sentiment.toFixed(2)}` : ''}${data.prediction ? ` - ${data.prediction}` : ''} - ${data.success ? 'SUCCESS' : 'ERROR'}`);
  }

  // Database Events
  trackDatabase(data: {
    queryType: string;
    latency: number;
    success: boolean;
    recordCount?: number;
  }) {
    const timestamp = new Date().toISOString();
    console.log(`💾 DB [${timestamp}] ${data.queryType} - ${data.latency}ms - ${data.success ? 'OK' : 'ERROR'}${data.recordCount ? ` - ${data.recordCount} records` : ''}`);
  }

  // System Performance
  trackSystem(data: {
    memory: number;
    cpu: number;
    activeStrategies: number;
    openPositions: number;
  }) {
    const timestamp = new Date().toISOString();
    console.log(`💻 SYSTEM [${timestamp}] Memory ${data.memory.toFixed(1)}% - CPU ${data.cpu.toFixed(1)}% - ${data.activeStrategies} strategies - ${data.openPositions} positions`);
  }

  // Phase Transitions
  trackPhase(data: {
    phase: number;
    completedTrades: number;
    winRate: number;
    totalPnL: number;
  }) {
    const timestamp = new Date().toISOString();
    console.log(`🎯 PHASE [${timestamp}] Phase ${data.phase} - ${data.completedTrades} trades - ${(data.winRate * 100).toFixed(1)}% win rate - $${data.totalPnL.toFixed(2)} total PnL`);
  }

  // Market Events
  trackMarket(data: {
    symbol: string;
    price: number;
    volume?: number;
    volatility?: number;
    trend?: string;
  }) {
    const timestamp = new Date().toISOString();
    console.log(`📈 MARKET [${timestamp}] ${data.symbol} - $${data.price.toFixed(2)}${data.volume ? ` - Vol: ${data.volume.toFixed(0)}` : ''}${data.volatility ? ` - Volatility: ${(data.volatility * 100).toFixed(1)}%` : ''}${data.trend ? ` - Trend: ${data.trend}` : ''}`);
  }

  // Errors and Warnings
  trackError(data: {
    component: string;
    error: string;
    severity: 'warning' | 'error' | 'critical';
    context?: any;
  }) {
    const timestamp = new Date().toISOString();
    const emoji = data.severity === 'critical' ? '🚨' : data.severity === 'error' ? '❌' : '⚠️';
    console.log(`${emoji} ${data.severity.toUpperCase()} [${timestamp}] ${data.component}: ${data.error}${data.context ? ` - Context: ${JSON.stringify(data.context)}` : ''}`);
  }

  // Health Check
  healthCheck() {
    const timestamp = new Date().toISOString();
    console.log(`💚 HEALTH [${timestamp}] ${this.config.serviceName} is healthy`);
  }
}

// Global instance
let telemetryInstance: ProductionTelemetry | null = null;

export function initProductionTelemetry(config?: Partial<TelemetryConfig>): ProductionTelemetry {
  if (!telemetryInstance) {
    telemetryInstance = new ProductionTelemetry({
      serviceName: config?.serviceName || 'quantum-forge-trading',
      environment: config?.environment || process.env.NODE_ENV || 'production',
      externalMonitoringServer: config?.externalMonitoringServer || 'http://174.72.187.118:3301'
    });
  }
  return telemetryInstance;
}

export function getTelemetry(): ProductionTelemetry {
  if (!telemetryInstance) {
    return initProductionTelemetry();
  }
  return telemetryInstance;
}

// Export the class for direct instantiation
export { ProductionTelemetry };

// Simple health check endpoint data
export const healthStatus = {
  lastHealthCheck: new Date(),
  isHealthy: true,
  uptime: process.uptime(),
  version: '4.0.0'
};