'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Home, 
  User, 
  Zap, 
  TrendingUp, 
  Settings,
  Activity,
  BarChart3,
  Target,
  Brain,
  TestTube,
  DollarSign,
  Sparkles
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { tradingAccountService, type TradingMode, type AccountData } from '../../lib/trading-account-service';
import { persistentEngine } from '../../lib/persistent-engine-manager';
import { getStratusEngineStatus } from '../../lib/global-stratus-engine-service';

// Import existing components that we'll consolidate
import KrakenAuth from '../kraken-auth';
import KrakenAccountDashboard from '../kraken-account-dashboard';
import KrakenChart from '../kraken-chart';
import RSIOptimizationDashboard from '../ai/RSIOptimizationDashboard';

// We'll create these consolidated components
import OverviewDashboard from './OverviewDashboard';
import AIStrategyEngine from './AIStrategyEngine';
import LiveTradingEngine from './LiveTradingEngine';
import ConfigurationPanel from './ConfigurationPanel';
import PaperTradingMonitor from './PaperTradingMonitor';
import AutomatedStrategyExecutionDashboard from '../automated-strategy-execution-dashboard';
import StratusEngineOptimizationDashboard from './StratusEngineOptimizationDashboard';
import RealTradingDashboard from './RealTradingDashboard';
import StratusNeuralPredictor from './StratusNeuralPredictor';
import StratusBrainDashboard from './StratusBrainDashboard';
import LiveTradingSystemDashboard from './LiveTradingSystemDashboard';

interface UnifiedDashboardProps {
  isKrakenConnected: boolean;
  onKrakenConnectionChange: (connected: boolean) => void;
}

export default function UnifiedDashboard({ 
  isKrakenConnected, 
  onKrakenConnectionChange 
}: UnifiedDashboardProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [tradingMode, setTradingMode] = useState<TradingMode>('paper');
  const [accountData, setAccountData] = useState<AccountData | null>(null);
  const [engineStatus, setEngineStatus] = useState({
    isRunning: persistentEngine.isRunning(),
    activeStrategies: 0,
    totalAlerts: 0,
    optimizationActive: false
  });

  // Handle trading mode changes
  useEffect(() => {
    tradingAccountService.setTradingMode(tradingMode);
  }, [tradingMode]);

  // Subscribe to persistent engine updates
  useEffect(() => {
    const updateEngineStatus = async () => {
      try {
        const status = await getStratusEngineStatus();
        setEngineStatus({
          isRunning: status.isRunning,
          activeStrategies: status.components.inputOptimizer.strategyCount || 0,
          totalAlerts: status.components.marketMonitor.eventCount || 0,
          optimizationActive: status.components.inputOptimizer.active
        });
      } catch (error) {
        console.error('Failed to get engine status:', error);
      }
    };

    // Initial update
    updateEngineStatus();

    // Listen for changes
    persistentEngine.addListener(updateEngineStatus);

    // Update periodically
    const interval = setInterval(updateEngineStatus, 5000);

    return () => {
      persistentEngine.removeListener(updateEngineStatus);
      clearInterval(interval);
    };
  }, []);

  // Subscribe to account data changes
  useEffect(() => {
    const unsubscribe = tradingAccountService.subscribe((data) => {
      setAccountData(data);
    });

    // Initial data fetch with fallback
    tradingAccountService.getAccountData().then(data => {
      if (data) {
        setAccountData(data);
      } else {
        // Set default data if fetch fails
        setAccountData({
          totalValue: 0,
          availableBalance: 0,
          unrealizedPnL: 0,
          realizedPnL: 0,
          positions: [],
          orders: [],
          balances: {},
          lastUpdated: new Date(),
          tradingMode
        });
      }
    });

    return unsubscribe;
  }, []);

  // Monitor engine status
  useEffect(() => {
    // Fetch real engine status from multiple sources
    const fetchEngineStatus = async () => {
      try {
        // Get status from Stratus Engine (now with real data)
        const stratusStatus = await getStratusEngineStatus();
        
        // Try to get additional status from dynamic triggers API
        let dynamicTriggersData = null;
        try {
          const response = await fetch('/api/dynamic-triggers?action=status');
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              dynamicTriggersData = result.data;
            }
          }
        } catch (apiError) {
          console.log('Dynamic triggers API not available, using Stratus Engine data only');
        }
        
        // Combine real data from both sources
        setEngineStatus({
          isRunning: stratusStatus.isRunning,
          activeStrategies: stratusStatus.components.inputOptimizer.strategyCount,
          totalAlerts: dynamicTriggersData?.totalAlerts || stratusStatus.components.marketMonitor.eventCount,
          optimizationActive: stratusStatus.components.inputOptimizer.active
        });
        
      } catch (error) {
        console.error('Failed to fetch engine status:', error);
      }
    };

    // Initial fetch
    fetchEngineStatus();

    // Poll every 10 seconds
    const interval = setInterval(fetchEngineStatus, 10000);

    return () => clearInterval(interval);
  }, []);

  // Listen for navigation events from child components
  useEffect(() => {
    const handleNavigateToTrading = () => {
      setActiveTab('trading');
    };

    window.addEventListener('navigate-to-trading', handleNavigateToTrading);
    return () => window.removeEventListener('navigate-to-trading', handleNavigateToTrading);
  }, []);

  const handleTradingModeChange = (mode: TradingMode) => {
    setTradingMode(mode);
    console.log(`🔄 Dashboard trading mode changed to: ${mode}`);
  };

  const tabItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: Home,
      description: 'Dashboard summary'
    },
    {
      id: 'live-system',
      label: 'Live System',
      icon: Activity,
      description: 'Unified Live Trading Status'
    },
    {
      id: 'strategy-monitor',
      label: 'Strategy Monitor',
      icon: BarChart3,
      description: 'AI-Enhanced Strategy Performance'
    },
    {
      id: 'stratus-brain',
      label: 'Stratus Brain',
      icon: Sparkles,
      description: 'Markov Chain + Law of Large Numbers'
    },
    {
      id: 'alpaca-paper',
      label: 'Paper Trading',
      icon: TestTube,
      description: 'Alpaca Simulated Trading'
    },
    {
      id: 'real-trading',
      label: 'Live Trading',
      icon: DollarSign,
      description: 'Kraken Real Money Trading'
    },
    {
      id: 'account',
      label: 'Account',
      icon: User,
      description: 'API & Balance'
    },
    {
      id: 'ai-engine',
      label: 'AI Engine',
      icon: Brain,
      description: 'Strategy & Optimization'
    },
    {
      id: 'stratus-optimizer',
      label: 'Stratus Optimizer',
      icon: Zap,
      description: 'Real-time Pine Script Optimization'
    },
    {
      id: 'trading',
      label: 'Trading Charts',
      icon: TrendingUp,
      description: 'Market Charts & Analysis'
    },
    {
      id: 'config',
      label: 'Configuration',
      icon: Settings,
      description: 'Settings & Testing'
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewDashboard 
            isKrakenConnected={isKrakenConnected}
            engineStatus={engineStatus}
          />
        );
      
      case 'live-system':
        return <LiveTradingSystemDashboard />;
      
      case 'strategy-monitor':
        return <PaperTradingMonitor />;
      
      case 'stratus-brain':
        return <StratusBrainDashboard />;
      
      case 'alpaca-paper':
        return session?.user?.id ? (
          <div className="space-y-6">
            <Card className="p-6 bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
              <h2 className="text-2xl font-bold mb-4">📝 Paper Trading (Alpaca)</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-blue-900 mb-2">ℹ️ About Paper Trading</h3>
                <div className="space-y-2 text-sm text-blue-800">
                  <div>• <strong>Simulated Trading:</strong> Uses fake money via Alpaca's paper trading API</div>
                  <div>• <strong>Real Market Data:</strong> Live market prices but no real money at risk</div>
                  <div>• <strong>Strategy Testing:</strong> Test all strategies safely before going live</div>
                  <div>• <strong>Performance Tracking:</strong> Track wins, losses, and AI optimization</div>
                  <div>• <strong>Risk-Free:</strong> Perfect for learning and strategy validation</div>
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">✅ Safe for Testing</h3>
                <p className="text-sm text-green-800">
                  Paper trading lets you test all strategies with zero financial risk. 
                  Only proceed to live trading after achieving consistent profits here.
                </p>
              </div>
            </Card>
            <AutomatedStrategyExecutionDashboard userId={session.user.id} />
          </div>
        ) : (
          <div className="p-6 text-center">
            <p>Please log in to access paper trading.</p>
          </div>
        );
      
      case 'real-trading':
        return (
          <div className="space-y-6">
            <Card className="p-6 bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
              <h2 className="text-2xl font-bold mb-4">🚨 Live Trading (Kraken)</h2>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-red-900 mb-2">⚠️ REAL MONEY TRADING</h3>
                <div className="space-y-2 text-sm text-red-800">
                  <div>• <strong>Live Trading:</strong> Uses real money from your Kraken account</div>
                  <div>• <strong>Webhook System:</strong> AI signals sent to kraken.circuitcartel.com/webhook</div>
                  <div>• <strong>Automatic Execution:</strong> Trades execute automatically when AI confidence is high</div>
                  <div>• <strong>Risk Management:</strong> Stop losses and position limits are enforced</div>
                  <div>• <strong>Real Profits/Losses:</strong> All gains and losses affect your actual balance</div>
                </div>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h3 className="font-semibold text-orange-900 mb-2">📋 Prerequisites</h3>
                <p className="text-sm text-orange-800">
                  Only proceed with live trading after achieving consistent profits in Paper Trading.
                  Ensure you have proper risk management settings and sufficient funds in your Kraken account.
                </p>
              </div>
            </Card>
            <RealTradingDashboard />
          </div>
        );
      
      case 'account':
        return (
          <div className="space-y-6">
            {/* Live Trading Setup Instructions */}
            {!isKrakenConnected && (
              <Card className="p-6 bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
                <h2 className="text-2xl font-bold mb-4">💰 Live Trading Setup</h2>
                
                {/* Setup Steps */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-red-900 mb-3">📋 Live Trading Setup Steps</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">1</span>
                      <span>Connect Kraken API below (Query Funds + Query Orders permissions)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">2</span>
                      <span>Switch mode to "Live" (top right)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">3</span>
                      <span>Stratus Engine automatically sends trades to kraken.circuitcartel.com/webhook</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">4</span>
                      <span>Monitor live trades and AI optimization in real-time!</span>
                    </div>
                  </div>
                </div>

                {/* How It Works */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-purple-900 mb-3">🧠 How Live Trading Works</h3>
                  <div className="space-y-2 text-sm text-purple-800">
                    <div>• <strong>AI Analysis:</strong> Continuously analyzes market data and strategy performance</div>
                    <div>• <strong>Strategy Optimization:</strong> AI adjusts parameters based on market conditions</div>
                    <div>• <strong>Signal Generation:</strong> AI decides when to buy/sell with high confidence</div>
                    <div>• <strong>Webhook System:</strong> Sends verified trades to kraken.circuitcartel.com/webhook</div>
                    <div>• <strong>Real Execution:</strong> Kraken executes trades with your actual funds</div>
                  </div>
                </div>

                {/* Warning */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Important Safety Notes</h3>
                  <div className="text-sm text-yellow-800">
                    <div>• Live trading uses REAL MONEY - Stratus Engine trades automatically!</div>
                    <div>• Test thoroughly with Paper Trading first before enabling live mode</div>
                    <div>• Only proceed with strategies showing 60%+ win rates and consistent profits</div>
                    <div>• AI monitors markets 24/7 and executes trades when confidence is high</div>
                    <div>• Emergency stops and risk limits are enforced automatically</div>
                  </div>
                </div>
              </Card>
            )}

            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">🔐 API Connection</h2>
                <KrakenAuth onConnectionChange={onKrakenConnectionChange} />
              </Card>
              
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">📊 Account Status</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Connection Status:</span>
                    <Badge variant={isKrakenConnected ? 'default' : 'destructive'}>
                      {isKrakenConnected ? '🟢 Connected' : '🔴 Disconnected'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">API Permissions:</span>
                    <span className="text-sm text-gray-500">
                      {isKrakenConnected ? 'Query Funds, Query Orders' : 'Not Available'}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
            
            {/* Post-Connection Success Guide */}
            {isKrakenConnected && (
              <Card className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
                <h3 className="font-semibold text-green-900 mb-2">✅ Kraken Connected - Ready for Live Trading Setup!</h3>
                <div className="text-sm text-green-700 space-y-1">
                  <div><strong>Next Steps:</strong></div>
                  <div><strong>1.</strong> Verify paper trading performance in "Paper Trading" tab</div>
                  <div><strong>2.</strong> Switch to "Live" mode (top right) when ready</div>
                  <div><strong>3.</strong> Monitor live trades in "Live Trading" tab</div>
                  <div><strong>4.</strong> AI will execute trades automatically via webhook system</div>
                </div>
              </Card>
            )}
            
            {isKrakenConnected && activeTab === 'account' && (
              <KrakenAccountDashboard isConnected={isKrakenConnected} />
            )}
          </div>
        );
      
      case 'ai-engine':
        return (
          <AIStrategyEngine 
            isKrakenConnected={isKrakenConnected}
            engineStatus={engineStatus}
          />
        );
      
      case 'stratus-optimizer':
        return <StratusEngineOptimizationDashboard />;
      
      case 'trading':
        return (
          <LiveTradingEngine 
            isKrakenConnected={isKrakenConnected}
            engineStatus={engineStatus}
          />
        );
      
      case 'config':
        return (
          <ConfigurationPanel 
            engineStatus={engineStatus}
          />
        );
      
      default:
        return <OverviewDashboard isKrakenConnected={isKrakenConnected} engineStatus={engineStatus} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 lg:py-4">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Signal Cartel Dashboard</h1>
            <p className="text-sm lg:text-base text-gray-600">
              Unified trading platform powered by The Stratus Engine™
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 lg:gap-4">
            {/* Trading Mode Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Mode:</span>
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => handleTradingModeChange('paper')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    tradingMode === 'paper'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  📝 Paper
                </button>
                <button
                  onClick={() => handleTradingModeChange('live')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    tradingMode === 'live'
                      ? 'bg-red-500 text-white'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  💰 Live
                </button>
              </div>
            </div>

            {/* Account Balance */}
            {accountData && accountData.totalValue !== undefined && (
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">
                  ${(accountData.totalValue || 0).toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  {tradingMode === 'paper' ? 'Paper Balance' : 'Live Balance'}
                </div>
              </div>
            )}
            
            {/* Engine Status Indicator */}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                engineStatus.isRunning ? 'bg-green-400' : 'bg-gray-400'
              }`} />
              <span className="text-sm text-gray-600">
                {engineStatus.isRunning ? 'Engine Active' : 'Engine Stopped'}
              </span>
            </div>
            
            {/* User Info & Actions */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">
                  {session?.user?.name || session?.user?.email}
                </div>
                <div className="text-xs text-gray-500">
                  {session?.user?.role === 'super_admin' ? 'Super Admin' : 
                   session?.user?.role === 'admin' ? 'Admin' : 
                   'Professional Trader'}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (session?.user?.role === 'admin' || session?.user?.role === 'super_admin') {
                      router.push('/admin');
                    } else {
                      router.push('/');
                    }
                  }}
                  className="text-gold-600 hover:text-gold-700 text-xs px-2 py-1 border border-gold-200 rounded hover:bg-gold-50 transition-colors"
                >
                  {session?.user?.role === 'admin' || session?.user?.role === 'super_admin' ? 'Admin' : 'Home'}
                </button>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="text-red-600 hover:text-red-700 text-xs px-2 py-1 border border-red-200 rounded hover:bg-red-50 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Tab Navigation */}
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-4 xl:grid-cols-11 gap-1 h-auto p-2 mb-6">
            {tabItems.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id}
                  className="flex flex-col items-center justify-center space-y-1 py-3 px-2 h-auto"
                >
                  <IconComponent size={18} />
                  <span className="text-xs font-medium">{tab.label}</span>
                  <span className="hidden lg:block text-[10px] text-gray-500">{tab.description}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Tab Content */}
          <div className="min-h-[calc(100vh-320px)]">
            {renderTabContent()}
          </div>
        </Tabs>
      </div>

      {/* Status Bar */}
      <div className="bg-gray-900 text-white px-4 lg:px-6 py-2 mt-6">
        <div className="flex flex-col lg:flex-row lg:justify-between items-start lg:items-center text-xs lg:text-sm gap-2">
          <div className="flex flex-wrap items-center gap-2 lg:gap-6">
            <span className="flex items-center space-x-2">
              <Activity size={16} />
              <span>Stratus Engine: {engineStatus.isRunning ? '🟢 Active' : '🔴 Stopped'}</span>
            </span>
            <span className="flex items-center space-x-2">
              <Target size={16} />
              <span>Active Strategies: {engineStatus.activeStrategies} 
                {engineStatus.activeStrategies > 0 ? ' 📊' : ' ⏸️'}
              </span>
            </span>
            <span className="flex items-center space-x-2">
              <BarChart3 size={16} />
              <span>System Alerts: {engineStatus.totalAlerts}
                {engineStatus.totalAlerts > 0 ? ' 🚨' : ' 🔕'}
              </span>
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            {engineStatus.optimizationActive && (
              <Badge variant="outline" className="bg-yellow-400/20 text-yellow-400 border-yellow-400">
                🧠 AI Optimizing...
              </Badge>
            )}
            <span className="text-gray-400">
              Last Update: {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}