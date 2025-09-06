import { krakenApiService } from './src/lib/kraken-api-service';

async function emergencyLiquidateAllPositions() {
    console.log('🚨 EMERGENCY LIQUIDATION: Starting position liquidation...');
    
    const krakenService = krakenApiService;
    
    try {
        // Get current open positions
        console.log('📊 Fetching open positions...');
        const positions = await krakenService.getOpenPositions();
        
        if (!positions || Object.keys(positions).length === 0) {
            console.log('✅ No open positions found on Kraken');
            return;
        }
        
        console.log(`🎯 Found ${Object.keys(positions).length} open positions:`);
        
        // Log positions for confirmation
        for (const [posId, position] of Object.entries(positions)) {
            console.log(`  - ${position.pair}: ${position.vol} @ ${position.cost}`);
        }
        
        // Close all positions via market orders
        console.log('\n💰 Executing liquidation orders...');
        
        for (const [posId, position] of Object.entries(positions)) {
            try {
                const pair = position.pair;
                const volume = Math.abs(parseFloat(position.vol));
                const side = parseFloat(position.vol) > 0 ? 'sell' : 'buy'; // Opposite to close
                
                console.log(`🔄 Closing ${pair}: ${side} ${volume}`);
                
                // Place market order to close position
                const orderResult = await krakenService.addOrder({
                    pair: pair,
                    type: side as 'buy' | 'sell',
                    ordertype: 'market',
                    volume: volume.toString(),
                    validate: false
                });
                
                if (orderResult && orderResult.txid) {
                    console.log(`✅ ${pair} liquidation order placed: ${orderResult.txid}`);
                } else {
                    console.log(`❌ Failed to place order for ${pair}`);
                }
                
                // Small delay between orders
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.error(`❌ Error closing position ${position.pair}:`, error);
            }
        }
        
        console.log('\n⏳ Waiting 5 seconds for orders to execute...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Verify positions are closed
        console.log('🔍 Verifying liquidation...');
        const remainingPositions = await krakenService.getOpenPositions();
        
        if (!remainingPositions || Object.keys(remainingPositions).length === 0) {
            console.log('✅ ALL POSITIONS SUCCESSFULLY LIQUIDATED');
        } else {
            console.log(`⚠️  ${Object.keys(remainingPositions).length} positions still open:`);
            for (const [posId, position] of Object.entries(remainingPositions)) {
                console.log(`  - ${position.pair}: ${position.vol}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Emergency liquidation failed:', error);
        throw error;
    }
}

// Execute if run directly
if (require.main === module) {
    emergencyLiquidateAllPositions()
        .then(() => {
            console.log('🎯 Emergency liquidation completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Emergency liquidation failed:', error);
            process.exit(1);
        });
}

export { emergencyLiquidateAllPositions };