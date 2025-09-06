import { KrakenApiService } from './src/lib/kraken-api-service.js';

async function checkOpenOrders() {
    try {
        console.log('🔍 Checking Kraken for open orders...');
        
        const krakenService = new KrakenApiService();
        const openOrders = await krakenService.getOpenOrders();
        
        console.log('📊 Raw Response:', JSON.stringify(openOrders, null, 2));
        
        if (openOrders && openOrders.open) {
            const orderIds = Object.keys(openOrders.open);
            console.log(`\n🎯 Found ${orderIds.length} open orders:`);
            
            for (const orderId of orderIds) {
                const order = openOrders.open[orderId];
                console.log(`\n📋 Order ${orderId}:`);
                console.log(`  Symbol: ${order.descr?.pair}`);
                console.log(`  Type: ${order.descr?.type} ${order.descr?.ordertype}`);
                console.log(`  Volume: ${order.vol} (executed: ${order.vol_exec})`);
                console.log(`  Price: ${order.descr?.price || order.price || 'market'}`);
                console.log(`  Status: ${order.status}`);
                
                // Check if this is a SOLUSD order
                if (order.descr?.pair?.includes('SOL')) {
                    console.log('  ⚠️ This is a SOLUSD order!');
                    if (order.descr?.type === 'sell') {
                        console.log('  🚨 This is a SELL order - in SPOT market this requires owning the asset!');
                    }
                }
            }
        } else {
            console.log('✅ No open orders found');
        }
        
        // Also check balance for SOL
        console.log('\n💰 Checking SOL balance...');
        const balance = await krakenService.getAccountBalance();
        console.log('Balance response:', JSON.stringify(balance, null, 2));
        
        if (balance) {
            const solKeys = Object.keys(balance).filter(key => key.includes('SOL'));
            if (solKeys.length > 0) {
                console.log('\n🪙 SOL Balance:');
                for (const key of solKeys) {
                    console.log(`  ${key}: ${balance[key]}`);
                }
            } else {
                console.log('  No SOL balance found');
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkOpenOrders();