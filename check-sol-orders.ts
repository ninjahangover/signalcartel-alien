import { krakenApiService } from './src/lib/kraken-api-service.js';

async function checkSOLOrders() {
    try {
        console.log('🔍 Checking for open orders on Kraken...\n');
        
        // Get open orders
        const openOrders = await krakenApiService.getOpenOrders();
        
        if (openOrders && openOrders.open) {
            const orderIds = Object.keys(openOrders.open);
            console.log(`📊 Found ${orderIds.length} open order(s):\n`);
            
            let solOrderFound = false;
            
            for (const orderId of orderIds) {
                const order = openOrders.open[orderId];
                const pair = order.descr?.pair || '';
                
                console.log(`Order ID: ${orderId}`);
                console.log(`  Pair: ${pair}`);
                console.log(`  Type: ${order.descr?.type} ${order.descr?.ordertype}`);
                console.log(`  Volume: ${order.vol} (executed: ${order.vol_exec})`);
                console.log(`  Price: ${order.descr?.price || order.price || 'market'}`);
                console.log(`  Status: ${order.status}`);
                console.log(`  Order info: ${order.descr?.order}`);
                
                // Check if this is SOL related
                if (pair.includes('SOL')) {
                    solOrderFound = true;
                    console.log('\n⚠️  THIS IS A SOL ORDER!');
                    
                    if (order.descr?.type === 'sell') {
                        console.log('🚨 This is a SELL order!');
                        console.log('   In SPOT markets, SELL orders require owning the asset.');
                        console.log('   If you don\'t own SOL, this order cannot execute.');
                    }
                }
                console.log('---');
            }
            
            if (!solOrderFound) {
                console.log('✅ No SOL-related orders found\n');
            }
        } else {
            console.log('✅ No open orders found\n');
        }
        
        // Check balance
        console.log('💰 Checking account balance for SOL...\n');
        const balance = await krakenApiService.getAccountBalance();
        
        if (balance) {
            const solAssets = Object.keys(balance).filter(key => 
                key.includes('SOL') || key === 'XSOL'
            );
            
            if (solAssets.length > 0) {
                console.log('SOL Balance:');
                for (const asset of solAssets) {
                    console.log(`  ${asset}: ${balance[asset]}`);
                }
            } else {
                console.log('  No SOL balance found (0 SOL owned)');
            }
            
            // Show USD balance too
            const usdAssets = Object.keys(balance).filter(key => 
                key.includes('USD') || key === 'ZUSD'
            );
            if (usdAssets.length > 0) {
                console.log('\nUSD Balance:');
                for (const asset of usdAssets) {
                    console.log(`  ${asset}: ${balance[asset]}`);
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Response:', error.response);
        }
    }
}

checkSOLOrders();