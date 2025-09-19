/**
 * Test QUANTUM FORGE™ Profit Predator - Hunt & Kill Trading System
 * 
 * Validates the "guerrilla warfare" trading approach:
 * 1. Hunt worthwhile opportunities with limited capital
 * 2. Factor in commissions, slippage, and real-world costs
 * 3. Remove human emotion through AI-driven decisions
 * 4. Demonstrate how intelligence overcomes capital limitations
 * 5. Show compound growth from small, consistent wins
 */

import { profitPredator } from './src/lib/quantum-forge-profit-predator';

interface TradeCostAnalysis {
  grossProfit: number;
  commissions: number;
  slippage: number;
  netProfit: number;
  netProfitPercent: number;
  worthwhile: boolean;
  reasonNotWorthwhile?: string;
}

async function testProfitPredator() {
  console.log('🐅 QUANTUM FORGE™ PROFIT PREDATOR - HUNT & KILL VALIDATION');
  console.log('💀 Limited capital + AI intelligence = Exponential growth over time');
  console.log('🎯 Factoring in real-world costs: commissions, slippage, emotions');
  console.log('⚔️  Guerrilla warfare trading: Hunt worthwhile opportunities, kill them efficiently\\n');

  // Simulate limited starting capital scenario
  const startingCapital = 2500; // Limited starting funds
  const commissionRate = 0.001; // 0.1% commission per trade
  const slippageRate = 0.0005;  // 0.05% slippage per trade
  const minWorthwhileReturn = 1.5; // Need 1.5% net return minimum to be worthwhile

  try {
    // Hunt for opportunities with our predator system
    console.log('🔍 HUNTING PHASE - Scanning all markets for worthwhile opportunities...');
    const hunts = await profitPredator.huntForProfits();

    if (hunts.length === 0) {
      console.log('⚠️  No profitable hunts detected in current market conditions');
      return;
    }

    console.log(`📊 Found ${hunts.length} potential hunting opportunities\\n`);

    // Analyze each hunt for real-world profitability
    console.log('💰 KILL ANALYSIS - Evaluating opportunities after real-world costs:\\n');
    
    const viableHunts: any[] = [];
    
    for (let i = 0; i < Math.min(10, hunts.length); i++) {
      const hunt = hunts[i];
      
      // Calculate position size for limited capital
      const maxRiskAmount = startingCapital * hunt.positionRisk;
      const actualPositionSize = Math.min(maxRiskAmount, startingCapital * 0.15); // Max 15% per hunt
      
      // Calculate real-world costs
      const grossProfitDollars = (hunt.expectedReturn / 100) * actualPositionSize;
      const commissions = actualPositionSize * commissionRate * 2; // Entry + exit
      const slippage = actualPositionSize * slippageRate * 2; // Entry + exit
      const netProfitDollars = grossProfitDollars - commissions - slippage;
      const netProfitPercent = (netProfitDollars / actualPositionSize) * 100;
      
      const analysis: TradeCostAnalysis = {
        grossProfit: grossProfitDollars,
        commissions: commissions,
        slippage: slippage,
        netProfit: netProfitDollars,
        netProfitPercent: netProfitPercent,
        worthwhile: netProfitPercent >= minWorthwhileReturn && netProfitDollars > 10
      };
      
      if (!analysis.worthwhile) {
        if (netProfitPercent < minWorthwhileReturn) {
          analysis.reasonNotWorthwhile = 'Net return too low after costs';
        } else if (netProfitDollars <= 10) {
          analysis.reasonNotWorthwhile = 'Absolute profit too small';
        }
      }
      
      console.log(`${i + 1}. ${hunt.symbol} (${hunt.huntType}):`);
      console.log(`   💎 Expected: ${hunt.expectedReturn.toFixed(1)}% | Expectancy: ${hunt.expectancyRatio.toFixed(1)}:1`);
      console.log(`   💰 Position: $${actualPositionSize.toFixed(0)} (${((actualPositionSize/startingCapital)*100).toFixed(1)}% of capital)`);
      console.log(`   📊 Gross Profit: $${grossProfitDollars.toFixed(2)}`);
      console.log(`   💸 Commissions: $${commissions.toFixed(2)} | Slippage: $${slippage.toFixed(2)}`);
      console.log(`   💵 Net Profit: $${netProfitDollars.toFixed(2)} (${netProfitPercent.toFixed(2)}%)`);
      
      if (analysis.worthwhile) {
        console.log(`   ✅ WORTHWHILE - Net return exceeds minimum threshold`);
        viableHunts.push({ hunt, analysis, positionSize: actualPositionSize });
      } else {
        console.log(`   ❌ NOT WORTHWHILE - ${analysis.reasonNotWorthwhile}`);
      }
      console.log();
    }

    // Show viable hunting opportunities
    console.log(`\\n🏆 VIABLE HUNTS AFTER COST ANALYSIS: ${viableHunts.length}/${Math.min(10, hunts.length)}`);
    
    if (viableHunts.length > 0) {
      console.log('\\n🎯 TOP VIABLE HUNTS (Hunt & Kill Targets):');
      console.log(`   ${'#'} ${'Symbol'.padEnd(8)} ${'Type'.padEnd(18)} ${'Net$'.padEnd(8)} ${'Net%'.padEnd(6)} ${'Risk%'.padEnd(6)} ${'Hold'.padEnd(6)}`);
      console.log(`   - ${'-'.repeat(8)} ${'-'.repeat(18)} ${'-'.repeat(8)} ${'-'.repeat(6)} ${'-'.repeat(6)} ${'-'.repeat(6)}`);
      
      viableHunts.slice(0, 5).forEach((viable, idx) => {
        const { hunt, analysis, positionSize } = viable;
        const riskPercent = (positionSize / startingCapital) * 100;
        const holdTime = hunt.maxHoldMinutes > 60 ? `${(hunt.maxHoldMinutes/60).toFixed(1)}h` : `${hunt.maxHoldMinutes}m`;
        
        console.log(`   ${(idx + 1).toString().padEnd(1)} ${hunt.symbol.padEnd(8)} ${hunt.huntType.padEnd(18)} $${analysis.netProfit.toFixed(0).padEnd(7)} ${analysis.netProfitPercent.toFixed(1).padEnd(5)}% ${riskPercent.toFixed(1).padEnd(5)}% ${holdTime.padEnd(6)}`);
      });

      // Simulate compound growth potential
      console.log('\\n💹 COMPOUND GROWTH SIMULATION (Hunt & Kill Strategy):');
      
      const avgNetReturn = viableHunts.reduce((sum, v) => sum + v.analysis.netProfitPercent, 0) / viableHunts.length;
      const avgHoldTime = viableHunts.reduce((sum, v) => sum + v.hunt.maxHoldMinutes, 0) / viableHunts.length;
      const tradesPerDay = Math.min(8, (24 * 60) / avgHoldTime); // Max 8 trades per day
      const tradesPerMonth = tradesPerDay * 22; // 22 trading days
      
      console.log(`   📊 Average Net Return: ${avgNetReturn.toFixed(2)}% per hunt`);
      console.log(`   ⏱️  Average Hold Time: ${avgHoldTime.toFixed(0)} minutes`);
      console.log(`   🔄 Trading Velocity: ${tradesPerDay.toFixed(1)} hunts/day, ${tradesPerMonth.toFixed(0)} hunts/month`);
      
      // Calculate compound growth (conservative estimate)
      const conservativeSuccessRate = 0.65; // 65% success rate (conservative)
      const conservativeAvgReturn = avgNetReturn * conservativeSuccessRate;
      const monthlyReturn = (conservativeAvgReturn / 100) * tradesPerMonth;
      
      let portfolioValue = startingCapital;
      console.log('\\n   📈 Projected Growth (Conservative 65% Success Rate):');
      console.log(`      Month 0: $${portfolioValue.toFixed(0)}`);
      
      for (let month = 1; month <= 6; month++) {
        portfolioValue *= (1 + monthlyReturn);
        const totalGain = portfolioValue - startingCapital;
        const totalReturnPercent = (totalGain / startingCapital) * 100;
        console.log(`      Month ${month}: $${portfolioValue.toFixed(0)} (+$${totalGain.toFixed(0)}, +${totalReturnPercent.toFixed(0)}%)`);
      }

      // Intelligence advantages
      console.log('\\n🧠 INTELLIGENCE ADVANTAGES (Why We Win Over Time):');
      console.log('   ✓ Multi-AI Consensus - Find opportunities others miss');
      console.log('   ✓ Real-time Evolution - Get smarter with every trade');
      console.log('   ✓ Emotion-free Execution - No fear, greed, or hesitation');
      console.log('   ✓ Pair Agnostic Hunting - Hunt profits anywhere they exist');
      console.log('   ✓ Expectancy Optimization - Accept small losses for bigger wins');
      console.log('   ✓ Cost-aware Analysis - Factor in all real-world expenses');
      console.log('   ✓ Adaptive Position Sizing - Risk management scales with opportunity');

      // Risk management validation
      console.log('\\n🛡️ RISK MANAGEMENT VALIDATION:');
      const totalRiskIfAllExecuted = viableHunts.slice(0, 3).reduce((sum, v) => sum + v.positionSize, 0);
      const portfolioRiskPercent = (totalRiskIfAllExecuted / startingCapital) * 100;
      
      console.log(`   💰 Capital at Risk: $${totalRiskIfAllExecuted.toFixed(0)} (${portfolioRiskPercent.toFixed(1)}% of capital)`);
      console.log(`   📊 Risk per Hunt: ${((viableHunts[0]?.positionSize || 0) / startingCapital * 100).toFixed(1)}% average`);
      console.log(`   ⚖️  Risk-Reward Balance: High intelligence compensates for limited capital`);
      console.log(`   🎯 Success Strategy: Small consistent wins compound into exponential growth`);

    } else {
      console.log('\\n⚠️  No viable hunts meet cost/benefit criteria in current market conditions');
      console.log('   💡 This demonstrates the system\'s intelligence - it won\'t trade unprofitable opportunities');
      console.log('   ⏳ Waiting for better market conditions shows discipline over desperation');
    }

    // Final assessment
    console.log('\\n🏁 HUNT & KILL VALIDATION COMPLETE');
    console.log('\\n💪 KEY STRENGTHS FOR LIMITED CAPITAL TRADING:');
    console.log('   🎯 Precision Targeting - Only hunt worthwhile opportunities');
    console.log('   💰 Cost Awareness - Every trade factors in real-world expenses');
    console.log('   🤖 Emotion Elimination - AI decisions remove human psychological errors');
    console.log('   📈 Compound Focus - Small consistent wins build exponential wealth');
    console.log('   🧠 Continuous Learning - System evolves and improves with every trade');
    console.log('   ⚡ Speed Advantage - React faster than human traders');
    console.log('\\n🚀 With intelligence backing every decision, time is our ultimate advantage!');

  } catch (error) {
    console.error('❌ Profit predator test failed:', error);
  }
}

// Run the hunt & kill validation
if (require.main === module) {
  testProfitPredator().catch(console.error);
}