#!/usr/bin/env npx tsx
/**
 * Test Dynamic Leverage Calculator
 * Demonstrates how leverage is mathematically determined based on market conditions
 */

import { dynamicLeverageCalculator } from './src/lib/dynamic-leverage-calculator';
import chalk from 'chalk';

async function testDynamicLeverage() {
  console.log(chalk.cyan('🧮 TESTING DYNAMIC LEVERAGE CALCULATOR'));
  console.log(chalk.white('═'.repeat(50)));

  // Test scenarios with different confidence and market conditions
  const testScenarios = [
    {
      name: "High Confidence Breakout",
      symbol: "BTCUSDT",
      price: 50000,
      stopLoss: 49000,
      takeProfit: 52000,
      aiConfidence: 0.85,
      description: "Strong AI signal with good risk/reward"
    },
    {
      name: "Moderate Confidence Trade",
      symbol: "ETHUSDT",
      price: 3000,
      stopLoss: 2900,
      takeProfit: 3200,
      aiConfidence: 0.65,
      description: "Decent opportunity but moderate confidence"
    },
    {
      name: "Low Confidence Signal",
      symbol: "SOLUSDT",
      price: 100,
      stopLoss: 98,
      takeProfit: 103,
      aiConfidence: 0.45,
      description: "Weak signal with poor risk/reward"
    },
    {
      name: "Excellent R:R Ratio",
      symbol: "AVAXUSDT",
      price: 40,
      stopLoss: 39,
      takeProfit: 45,
      aiConfidence: 0.75,
      description: "Good confidence with excellent 5:1 R:R"
    }
  ];

  for (const scenario of testScenarios) {
    console.log(chalk.magenta(`\n📊 Testing: ${scenario.name}`));
    console.log(chalk.dim(`${scenario.description}`));
    console.log(chalk.white('─'.repeat(40)));

    try {
      const leverageDecision = await dynamicLeverageCalculator.calculateOptimalLeverage(
        scenario.symbol,
        scenario.price,
        scenario.stopLoss,
        scenario.takeProfit,
        scenario.aiConfidence
      );

      // Calculate risk/reward ratio
      const riskDistance = Math.abs(scenario.price - scenario.stopLoss) / scenario.price;
      const rewardDistance = Math.abs(scenario.takeProfit - scenario.price) / scenario.price;
      const riskRewardRatio = rewardDistance / riskDistance;

      console.log(chalk.white(`Symbol: ${scenario.symbol}`));
      console.log(chalk.white(`Price: $${scenario.price.toLocaleString()}`));
      console.log(chalk.white(`Stop: $${scenario.stopLoss.toLocaleString()} | Target: $${scenario.takeProfit.toLocaleString()}`));
      console.log(chalk.white(`Risk/Reward: ${riskRewardRatio.toFixed(2)}:1`));
      console.log(chalk.white(`AI Confidence: ${(scenario.aiConfidence * 100).toFixed(1)}%`));
      console.log(chalk.green(`\n🔧 CALCULATED LEVERAGE: ${leverageDecision.leverage}x`));
      console.log(chalk.green(`📊 Leverage Confidence: ${(leverageDecision.confidence * 100).toFixed(1)}%`));
      console.log(chalk.green(`💰 Max Position Size: $${leverageDecision.maxPositionSize.toLocaleString()}`));

      console.log(chalk.cyan('\n🧠 Mathematical Reasoning:'));
      leverageDecision.reasoning.forEach(reason => {
        console.log(chalk.dim(`  • ${reason}`));
      });

      // Show effective position calculation
      const basePosition = 1000;
      const effectiveExposure = basePosition * leverageDecision.leverage;
      const marginRequired = basePosition;

      console.log(chalk.yellow(`\n💡 Example with $${basePosition} base position:`));
      console.log(chalk.yellow(`   Margin Required: $${marginRequired.toLocaleString()}`));
      console.log(chalk.yellow(`   Effective Exposure: $${effectiveExposure.toLocaleString()}`));
      console.log(chalk.yellow(`   Leverage Multiplier: ${leverageDecision.leverage}x`));

    } catch (error) {
      console.error(chalk.red(`❌ Error testing ${scenario.name}:`), error.message);
    }
  }

  console.log(chalk.cyan('\n✅ Dynamic Leverage Testing Complete'));
  console.log(chalk.white('═'.repeat(50)));
  console.log(chalk.green('🎯 The system dynamically adjusts leverage (1-5x) based on:'));
  console.log(chalk.green('   • AI confidence levels'));
  console.log(chalk.green('   • Market volatility and regime'));
  console.log(chalk.green('   • Risk/reward ratios'));
  console.log(chalk.green('   • Price action quality'));
  console.log(chalk.green('   • Mathematical model assessments'));
  console.log(chalk.green('   • CFT risk management rules'));
}

// Run the test
testDynamicLeverage().catch(console.error);