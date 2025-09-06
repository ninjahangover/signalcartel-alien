#!/usr/bin/env tsx

/**
 * Force liquidate all positions on Kraken platform via webhook
 * Used when database is out of sync with actual platform positions
 */

async function forceLiquidateAllKrakenPositions() {
    console.log('🚨 FORCE LIQUIDATION: All Kraken Platform Positions');
    console.log('==================================================');
    
    // Known positions from user report: SOLUSD, AVAXUSD, ETHUSD, BTCUSD, WLFIUSD
    const knownPositions = ['SOLUSD', 'AVAXUSD', 'ETHUSD', 'BTCUSD', 'WLFIUSD'];
    
    console.log('📊 Liquidating known positions:');
    for (const symbol of knownPositions) {
        console.log(`   - ${symbol}`);
    }
    
    let successCount = 0;
    let failCount = 0;
    
    // Send liquidation webhook for each known position
    for (const symbol of knownPositions) {
        try {
            console.log(`\n🔥 LIQUIDATING ${symbol}...`);
            
            // Create emergency liquidation webhook payload
            const webhookPayload = {
                passphrase: "sdfqoei1898498",
                ticker: symbol,
                strategy: {
                    order_action: "sell", // Assume long positions (most common)
                    order_type: "market",
                    order_price: "0", // Market price
                    order_contracts: "0", // Full position
                    type: "sell",
                    volume: "0", // Full position
                    pair: symbol,
                    validate: "false", // Execute immediately
                    close: {
                        order_type: "market",
                        price: "0"
                    },
                    stop_loss: "0",
                    emergency: true,
                    reason: "DATABASE_SYNC_LIQUIDATION",
                    force_close_all: true // Special flag for full liquidation
                }
            };
            
            console.log(`   📡 Sending liquidation webhook...`);
            
            const response = await fetch('https://kraken.circuitcartel.com/webhook', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'SignalCartel-Emergency-Liquidation/1.0'
                },
                body: JSON.stringify(webhookPayload)
            });
            
            if (response.ok) {
                const responseText = await response.text();
                console.log(`   ✅ ${symbol} liquidation sent: ${response.status}`);
                console.log(`   📝 Response: ${responseText}`);
                successCount++;
            } else {
                console.log(`   ❌ ${symbol} failed: ${response.status} ${response.statusText}`);
                failCount++;
            }
            
            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            console.error(`   ❌ Error liquidating ${symbol}:`, error.message);
            failCount++;
        }
    }
    
    // Also send a "close all positions" command
    try {
        console.log(`\n🚨 SENDING GLOBAL CLOSE-ALL COMMAND...`);
        
        const globalClosePayload = {
            passphrase: "sdfqoei1898498",
            action: "EMERGENCY_CLOSE_ALL",
            strategy: {
                emergency: true,
                close_all_positions: true,
                reason: "DATABASE_DESYNC_RECOVERY"
            }
        };
        
        const response = await fetch('https://kraken.circuitcartel.com/webhook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'SignalCartel-Emergency-CloseAll/1.0'
            },
            body: JSON.stringify(globalClosePayload)
        });
        
        if (response.ok) {
            console.log(`   ✅ Global close-all command sent: ${response.status}`);
        } else {
            console.log(`   ⚠️ Global close-all failed: ${response.status}`);
        }
        
    } catch (error) {
        console.error(`   ❌ Global close-all error:`, error.message);
    }
    
    // Summary
    console.log('\n🏁 FORCE LIQUIDATION COMPLETE');
    console.log('=============================');
    console.log(`✅ Successful liquidations: ${successCount}`);
    console.log(`❌ Failed liquidations: ${failCount}`);
    console.log(`📊 Total positions targeted: ${knownPositions.length}`);
    
    if (successCount > 0) {
        console.log('\n⏳ WAIT 30-60 seconds for orders to execute on Kraken platform');
        console.log('   Then check Kraken platform to verify positions are closed');
    }
    
    if (failCount > 0) {
        console.log('\n⚠️ Some liquidations failed - may need manual intervention');
        console.log('   Check Kraken platform and manually close remaining positions');
    }
    
    console.log('\n✅ Force liquidation process complete!');
}

// Execute if run directly
if (require.main === module) {
    forceLiquidateAllKrakenPositions()
        .then(() => {
            console.log('🎯 Force liquidation completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Force liquidation failed:', error);
            process.exit(1);
        });
}

export { forceLiquidateAllKrakenPositions };