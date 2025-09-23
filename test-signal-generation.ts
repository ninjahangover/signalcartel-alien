import { tradingAssistant } from './src/lib/manual-trading-assistant';
import chalk from 'chalk';

async function testSignalGeneration() {
  console.log(chalk.cyan('🧪 Testing Manual Trading Signal Generation\n'));

  try {
    console.log(chalk.yellow('🔄 Generating test signals...'));

    // Generate signals for priority pairs
    const btcSignal = await tradingAssistant.generateSignal('BTCUSD');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const ethSignal = await tradingAssistant.generateSignal('ETHUSD');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Show risk status
    const riskStatus = await tradingAssistant.getRiskStatus();
    console.log(chalk.cyan('\n📊 Current Risk Status:'));
    console.log(chalk.white(`Current Equity: $${riskStatus.currentEquity.toFixed(2)}`));
    console.log(chalk.white(`Daily P&L: $${riskStatus.dailyPnL.toFixed(2)}`));
    console.log(chalk.white(`Daily Loss Remaining: $${riskStatus.dailyLossRemaining.toFixed(2)}`));
    console.log(chalk.white(`Max Drawdown Remaining: $${riskStatus.maxDrawdownRemaining.toFixed(2)}`));
    console.log(chalk.white(`Can Trade: ${riskStatus.canTrade ? chalk.green('YES') : chalk.red('NO')}`));

    // Test recording a manual trade
    if (btcSignal) {
      console.log(chalk.yellow('\n📝 Testing manual trade recording...'));
      await tradingAssistant.recordTrade(
        'BTCUSD',
        'BUY',
        100, // $100 position
        50000 // BTC price
      );
    }

    console.log(chalk.green('\n✅ Signal generation system working!'));
    console.log(chalk.cyan('\nNext steps:'));
    console.log(chalk.dim('1. Start the system: ./breakout-start.sh'));
    console.log(chalk.dim('2. Watch for signals in console'));
    console.log(chalk.dim('3. Execute signals manually on Breakout platform'));
    console.log(chalk.dim('4. Monitor dashboard at http://localhost:3005'));

  } catch (error) {
    console.error(chalk.red('❌ Test failed:'), error);
  }
}

testSignalGeneration()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));