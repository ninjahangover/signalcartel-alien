import { createDxTradeClient } from './src/lib/dxtrade-client';
import chalk from 'chalk';

async function testDxTradeConnection() {
  console.log(chalk.cyan('🧪 Testing DxTrade Connection for Breakout\n'));

  try {
    // Create DxTrade client
    const dxClient = createDxTradeClient();

    console.log(chalk.dim('Credentials loaded:'));
    console.log(chalk.dim(`Username: ${process.env.DXTRADE_USERNAME}`));
    console.log(chalk.dim(`Domain: ${process.env.DXTRADE_DOMAIN}`));
    console.log(chalk.dim(`Platform URL: ${process.env.DXTRADE_PLATFORM_URL}`));
    console.log(chalk.dim(`API URL: ${process.env.DXTRADE_API_URL}\n`));

    // Test connection
    const connected = await dxClient.testConnection();

    if (connected) {
      console.log(chalk.green('\n🎯 DxTrade integration ready for Breakout evaluation!'));
      console.log(chalk.cyan('Next: Start the breakout trading system with ./breakout-start.sh'));
    } else {
      console.log(chalk.red('\n❌ Connection failed. Check credentials or platform URL.'));
    }

  } catch (error: any) {
    console.error(chalk.red('\n💥 Test failed:'), error.message);

    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.log(chalk.yellow('\n💡 Possible issues:'));
      console.log(chalk.dim('1. Platform URL might be incorrect'));
      console.log(chalk.dim('2. API endpoint might be different'));
      console.log(chalk.dim('3. Network connectivity issues'));
      console.log(chalk.dim('\nTry finding the correct platform URL from your Breakout account.'));
    }
  }
}

testDxTradeConnection()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));