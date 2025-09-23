import { PrismaClient } from '@prisma/client';
import chalk from 'chalk';

const prisma = new PrismaClient();

async function initBreakoutDatabase() {
  console.log(chalk.cyan('🔧 Initializing Breakout Evaluation Database...'));

  try {
    // Test database connection
    await prisma.$connect();
    console.log(chalk.green('✅ Database connection successful'));

    // Create breakout_eval schema if it doesn't exist
    await prisma.$executeRaw`CREATE SCHEMA IF NOT EXISTS breakout_eval;`;
    console.log(chalk.green('✅ breakout_eval schema created'));

    // Set search path to use breakout_eval schema
    await prisma.$executeRaw`SET search_path TO breakout_eval, public;`;
    console.log(chalk.green('✅ Search path set to breakout_eval'));

    // Initialize some base configuration
    console.log(chalk.yellow('📊 Setting up initial configuration...'));

    // Create initial evaluation state
    const initialState = {
      startingBalance: 5000,
      profitTarget: 500,
      dailyLossLimit: 200,
      maxDrawdown: 300,
      evaluationStart: new Date(),
      status: 'READY'
    };

    console.log(chalk.green('✅ Database initialized successfully!'));
    console.log(chalk.cyan('\nBreakout Evaluation System Ready:'));
    console.log(chalk.dim(`- Schema: breakout_eval`));
    console.log(chalk.dim(`- Starting Balance: $${initialState.startingBalance}`));
    console.log(chalk.dim(`- Profit Target: $${initialState.profitTarget}`));
    console.log(chalk.dim(`- Daily Loss Limit: $${initialState.dailyLossLimit}`));
    console.log(chalk.dim(`- Max Drawdown: $${initialState.maxDrawdown}`));

  } catch (error) {
    console.error(chalk.red('❌ Database initialization failed:'), error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  initBreakoutDatabase()
    .then(() => {
      console.log(chalk.green('\n🎯 Breakout evaluation database ready!'));
      process.exit(0);
    })
    .catch((error) => {
      console.error(chalk.red('\n💥 Initialization failed:'), error);
      process.exit(1);
    });
}

export { initBreakoutDatabase };