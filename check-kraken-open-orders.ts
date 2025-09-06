import fetch from 'node-fetch';

async function checkKrakenOpenOrders() {
    try {
        console.log('🔍 Checking Kraken for open orders...');
        
        // Use the proxy server approach that works in the dashboard
        const response = await fetch('http://127.0.0.1:3002/api/kraken', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                endpoint: 'OpenOrders',
                params: {}
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('📊 Kraken Open Orders Response:', JSON.stringify(data, null, 2));

        if (data.result && data.result.open) {
            const openOrders = Object.keys(data.result.open);
            console.log(`\n🎯 Found ${openOrders.length} open orders on Kraken:`);
            
            for (const orderId of openOrders) {
                const order = data.result.open[orderId];
                console.log(`  📋 Order ${orderId}:`);
                console.log(`    Symbol: ${order.descr?.pair}`);
                console.log(`    Type: ${order.descr?.type} ${order.descr?.ordertype}`);
                console.log(`    Volume: ${order.vol} (executed: ${order.vol_exec})`);
                console.log(`    Price: ${order.descr?.price}`);
                console.log(`    Status: ${order.status}`);
                console.log('');
            }
        } else {
            console.log('✅ No open orders found on Kraken');
        }

    } catch (error) {
        console.error('❌ Error checking Kraken orders:', error.message);
    }
}

checkKrakenOpenOrders();