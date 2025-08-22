'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { tradingAccountService, type AccountData } from '../../lib/trading-account-service';
import RealTimeChart from '../real-time-chart';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity, 
  Target,
  Zap,
  AlertCircle,
  CheckCircle,
  BarChart3
} from 'lucide-react';

interface OverviewDashboardProps {
  isKrakenConnected: boolean;
  engineStatus: {
    isRunning: boolean;
    activeStrategies: number;
    totalAlerts: number;
    optimizationActive: boolean;
  };
}

export default function OverviewDashboard({ 
  isKrakenConnected, 
  engineStatus 
}: OverviewDashboardProps) {
  
  const [accountData, setAccountData] = useState<AccountData | null>(null);
  const [customTradingData, setCustomTradingData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to account data from trading service
  useEffect(() => {
    setLoading(true);
    
    const unsubscribe = tradingAccountService.subscribe((data) => {
      setAccountData(data);
      setLoading(false);
      setError(null);
    });

    // Initial data fetch
    tradingAccountService.getAccountData()
      .then((data) => {
        setAccountData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch account data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch account data');
        setLoading(false);
      });

    return unsubscribe;
  }, []);

  // Fetch real-time custom trading data
  useEffect(() => {
    const fetchCustomData = async () => {
      try {
        const response = await fetch('/api/custom-paper-trading/dashboard');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setCustomTradingData(data.data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch custom trading data:', error);
      }
    };

    fetchCustomData();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchCustomData, 10000);
    
    return () => clearInterval(interval);
  }, []);

  // Use real account data - no fallbacks to fake data
  const portfolioData = accountData || null;

  // NO MOCK DATA - Only show real strategy performance when available
  // This will be replaced with real performance data from your trading engine

  const formatCurrency = (amount: number | undefined | null) => {
    const value = amount ?? 0;
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    });
  };

  return (
    <div className="space-y-6">
      {/* Trading Mode Status */}
      {accountData && (
        <Card className="p-4 border-blue-200 bg-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-blue-500" />
              <p className="text-sm text-blue-700">
                <strong>{accountData.tradingMode === 'paper' ? '📝 Paper Trading Mode' : '💰 Live Trading Mode'}</strong> - 
                {accountData.tradingMode === 'paper' 
                  ? ' Safe testing environment with simulated funds'
                  : ' Real money trading with live Kraken account'
                }
              </p>
            </div>
            {accountData.lastUpdated && (
              <span className="text-xs text-blue-600">
                Updated: {accountData.lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </Card>
      )}

      {/* Live Custom Trading Data */}
      {customTradingData && (
        <Card className="p-6 border-gold-200 bg-gradient-to-r from-gold-50 to-green-50">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-8 h-8 text-gold-600" />
            <div>
              <h3 className="text-xl font-bold text-gray-900">🚀 Live Custom Paper Trading</h3>
              <p className="text-gray-600">Real-time LLN & Markov Data Generation</p>
            </div>
            <div className="ml-auto text-sm text-green-600 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live Updates</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-700">{customTradingData.trades?.length || 0}</div>
              <div className="text-sm text-blue-600">Total Trades</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700">
                {customTradingData.trades?.length > 0 ? 
                  ((customTradingData.trades.filter((t: any) => t.pnl > 0).length / customTradingData.trades.filter((t: any) => t.pnl !== null).length) * 100).toFixed(1) 
                  : '0.0'}%
              </div>
              <div className="text-sm text-green-600">Win Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-700">
                ${(customTradingData.trades?.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0) || 0).toFixed(0)}
              </div>
              <div className="text-sm text-purple-600">Total P&L</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gold-700">
                ${((customTradingData.trades?.reduce((sum: number, t: any) => sum + t.value, 0) || 0) / 1000).toFixed(0)}K
              </div>
              <div className="text-sm text-gold-600">Volume</div>
            </div>
          </div>
          
          {/* LLN & Markov Progress */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-3 rounded-lg border-2 ${
              (customTradingData.trades?.length || 0) >= 10 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-center gap-2">
                <Target className={`w-5 h-5 ${(customTradingData.trades?.length || 0) >= 10 ? 'text-green-600' : 'text-yellow-600'}`} />
                <span className={`font-semibold ${(customTradingData.trades?.length || 0) >= 10 ? 'text-green-800' : 'text-yellow-800'}`}>
                  Markov Chain
                </span>
              </div>
              <div className={`text-sm ${(customTradingData.trades?.length || 0) >= 10 ? 'text-green-700' : 'text-yellow-700'}`}>
                {(customTradingData.trades?.length || 0) >= 10 ? '✅ ACTIVE' : `${10 - (customTradingData.trades?.length || 0)} more needed`}
              </div>
            </div>
            <div className={`p-3 rounded-lg border-2 ${
              (customTradingData.trades?.length || 0) >= 50 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-center gap-2">
                <BarChart3 className={`w-5 h-5 ${(customTradingData.trades?.length || 0) >= 50 ? 'text-green-600' : 'text-yellow-600'}`} />
                <span className={`font-semibold ${(customTradingData.trades?.length || 0) >= 50 ? 'text-green-800' : 'text-yellow-800'}`}>
                  Law of Large Numbers
                </span>
              </div>
              <div className={`text-sm ${(customTradingData.trades?.length || 0) >= 50 ? 'text-green-700' : 'text-yellow-700'}`}>
                {(customTradingData.trades?.length || 0) >= 50 ? '✅ ACTIVE' : `${50 - (customTradingData.trades?.length || 0)} more needed`}
              </div>
            </div>
          </div>
          
          {/* Recent Trades Preview */}
          {customTradingData.trades?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">Latest Trades</h4>
              <div className="flex gap-2 overflow-x-auto">
                {customTradingData.trades.slice(0, 5).map((trade: any) => (
                  <div key={trade.id} className="flex-shrink-0 bg-white p-2 rounded border text-xs">
                    <div className="font-medium">{trade.symbol}</div>
                    <div className={`${trade.side === 'buy' ? 'text-green-600' : 'text-red-600'}`}>
                      {trade.side.toUpperCase()}
                    </div>
                    <div className="text-gray-600">${trade.value.toFixed(0)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Connection Status for Live Trading */}
      {accountData?.tradingMode === 'live' && !isKrakenConnected && (
        <Card className="p-4 border-orange-200 bg-orange-50">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            <p className="text-sm text-orange-700">
              Connect your Kraken API in the Account tab for live trading data
            </p>
          </div>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-700">Error loading account data: {error}</p>
          </div>
        </Card>
      )}

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Portfolio Value</p>
              {loading ? (
                <div className="h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <p className="text-2xl font-bold">
                  {portfolioData 
                    ? formatCurrency(portfolioData.totalValue)
                    : '--'
                  }
                </p>
              )}
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
          {portfolioData && (
            <p className="text-xs text-gray-500 mt-1">
              {portfolioData.tradingMode} • {portfolioData.lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Available Balance</p>
              {loading ? (
                <div className="h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <p className="text-2xl font-bold">
                  {portfolioData 
                    ? formatCurrency(portfolioData.availableBalance)
                    : '--'
                  }
                </p>
              )}
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Unrealized P&L</p>
              {loading ? (
                <div className="h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <p className={`text-2xl font-bold ${
                  portfolioData && portfolioData.unrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {portfolioData 
                    ? `${portfolioData.unrealizedPnL >= 0 ? '+' : ''}${formatCurrency(portfolioData.unrealizedPnL)}`
                    : '--'
                  }
                </p>
              )}
            </div>
            {portfolioData && portfolioData.unrealizedPnL >= 0 ? 
              <TrendingUp className="h-8 w-8 text-green-500" /> :
              <TrendingDown className="h-8 w-8 text-red-500" />
            }
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">24h Alerts</p>
              <p className="text-2xl font-bold">{engineStatus.totalAlerts}</p>
            </div>
            <Activity className="h-8 w-8 text-orange-500" />
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* System Status */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Zap className="mr-2 h-5 w-5 text-yellow-500" />
            System Status
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Kraken API:</span>
              <Badge variant={isKrakenConnected ? 'default' : 'destructive'}>
                {isKrakenConnected ? (
                  <><CheckCircle className="mr-1 h-3 w-3" /> Connected</>
                ) : (
                  <><AlertCircle className="mr-1 h-3 w-3" /> Disconnected</>
                )}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Stratus Engine:</span>
              <Badge variant={engineStatus.isRunning ? 'default' : 'secondary'}>
                {engineStatus.isRunning ? (
                  <><CheckCircle className="mr-1 h-3 w-3" /> Active</>
                ) : (
                  <><AlertCircle className="mr-1 h-3 w-3" /> Stopped</>
                )}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">AI Optimization:</span>
              <Badge variant={engineStatus.optimizationActive ? 'outline' : 'secondary'}>
                {engineStatus.optimizationActive ? (
                  <><Activity className="mr-1 h-3 w-3" /> Optimizing</>
                ) : (
                  'Idle'
                )}
              </Badge>
            </div>
          </div>

          {!isKrakenConnected && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">
                ⚠️ Connect your Kraken API to enable live trading
              </p>
            </div>
          )}
        </Card>

        {/* Current Positions */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">📊 Current Positions</h3>
          
          {portfolioData && portfolioData.positions.length > 0 ? (
            <div className="space-y-3">
              {portfolioData.positions.map((position) => (
                <div 
                  key={`${position.symbol}-${position.side}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium">{position.symbol}</div>
                    <div className="text-sm text-gray-500">
                      {position.side} • {position.size} @ ${(position.entryPrice || 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${
                      position.pnl >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {position.pnl >= 0 ? '+' : ''}${(position.pnl || 0).toFixed(2)}
                    </div>
                    <div className={`text-sm ${
                      position.pnlPercent >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {position.pnlPercent >= 0 ? '+' : ''}{(position.pnlPercent || 0).toFixed(2)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Target className="mx-auto h-12 w-12 mb-2 text-gray-300" />
              <p>No open positions</p>
              <p className="text-xs text-gray-400 mt-1">
                {portfolioData 
                  ? `${portfolioData.tradingMode === 'paper' ? 'Paper' : 'Live'} positions will appear here`
                  : 'Connect account to see positions'
                }
              </p>
            </div>
          )}
        </Card>

        {/* Real Strategy Performance - Only show when data is available */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            🧠 Strategy Performance
          </h3>
          
          <div className="text-center py-8 text-gray-500">
            <Target className="mx-auto h-12 w-12 mb-2 text-gray-300" />
            <p className="text-sm">Real strategy performance data will appear here</p>
            <p className="text-xs text-gray-400 mt-1">Connect your Kraken API and activate strategies to see live performance metrics</p>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">⚡ Quick Actions</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button 
            className="flex flex-col items-center space-y-2 h-auto py-4"
            variant="outline"
            disabled={!isKrakenConnected}
          >
            <Activity className="h-6 w-6" />
            <span className="text-sm">Start Engine</span>
          </Button>
          
          <Button 
            className="flex flex-col items-center space-y-2 h-auto py-4"
            variant="outline"
            disabled={!isKrakenConnected}
          >
            <Zap className="h-6 w-6" />
            <span className="text-sm">Force Optimization</span>
          </Button>
          
          <Button 
            className="flex flex-col items-center space-y-2 h-auto py-4"
            variant="outline"
          >
            <Target className="h-6 w-6" />
            <span className="text-sm">View Strategies</span>
          </Button>
          
          <Button 
            className="flex flex-col items-center space-y-2 h-auto py-4"
            variant="outline"
          >
            <TrendingUp className="h-6 w-6" />
            <span className="text-sm">Open Trading</span>
          </Button>
        </div>
      </Card>

      {/* Live Market Chart */}
      {isKrakenConnected && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <BarChart3 className="mr-2 h-5 w-5 text-green-500" />
              🔴 LIVE Market Chart - BTCUSD
            </h3>
            <Badge variant="default" className="bg-green-500">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span>LIVE</span>
              </div>
            </Badge>
          </div>
          
          <RealTimeChart 
            symbol="BTCUSD"
            height={300}
            showControls={true}
            className="mb-4"
          />
          
          <div className="text-center">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                // Navigate to full trading view
                const event = new CustomEvent('navigate-to-trading');
                window.dispatchEvent(event);
              }}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              View Full Trading Charts
            </Button>
          </div>
        </Card>
      )}

      {/* Market Insights - Real Data */}
      {customTradingData && customTradingData.trades?.length >= 10 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">📈 Market Insights</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Current Market Performance</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Recent Trend:</span>
                  <Badge variant="outline">
                    {customTradingData.trades?.slice(0, 5).filter((t: any) => t.pnl > 0).length >= 3 ? '📈 Bullish' : '📉 Bearish'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Win Rate:</span>
                  <Badge variant="outline">
                    🎯 {((customTradingData.trades.filter((t: any) => t.pnl > 0).length / customTradingData.trades.filter((t: any) => t.pnl !== null).length) * 100).toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total P&L:</span>
                  <Badge variant="outline">
                    ⚡ ${customTradingData.trades?.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0).toFixed(0)}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Strategy Performance</h4>
              <div className="space-y-2 text-sm">
                <p className="text-gray-600">
                  🎯 Total trades executed: {customTradingData.trades?.length}
                </p>
                <p className="text-gray-600">
                  📊 Average trade size: ${(customTradingData.trades?.reduce((sum: number, t: any) => sum + t.value, 0) / customTradingData.trades?.length).toFixed(0)}
                </p>
                <p className="text-gray-600">
                  ⏰ Latest trade: {new Date(customTradingData.trades?.[0]?.executedAt || Date.now()).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}