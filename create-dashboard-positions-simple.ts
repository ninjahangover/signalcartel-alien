#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createDashboardPositions() {
    console.log('📊 Creating dashboard positions for BNB, DOT, and BTC...');

    const sessionId = "session-production-1757538257208";
    const userId = "user-production";
    const now = new Date();

    // Correct positions as stated by user: BNB, DOT, BTC
    const positions = [
        { symbol: 'BNBUSD', quantity: 0.07678462, price: 650, value: 49.91 },
        { symbol: 'DOTUSD', quantity: 24.3902439, price: 4.52, value: 110.24 },
        { symbol: 'BTCUSD', quantity: 0.00086187, price: 110000, value: 94.81 }
    ];

    for (const pos of positions) {
        console.log(`💰 Creating ${pos.symbol}: ${pos.quantity} @ $${pos.price} = $${pos.value}`);

        await prisma.livePosition.create({
            data: {
                id: `live-${pos.symbol.toLowerCase()}-${Date.now()}`,
                symbol: pos.symbol,
                quantity: pos.quantity,
                averagePrice: pos.price,
                currentPrice: pos.price,
                status: 'open',
                strategy: 'manual-sync',
                sessionId: sessionId,
                userId: userId,
                createdAt: now,
                updatedAt: now
            }
        });
    }

    const count = await prisma.livePosition.count();
    const totalValue = positions.reduce((sum, p) => sum + p.value, 0);

    console.log('\n✅ SUCCESS: Dashboard positions created!');
    console.log(`📊 Total positions: ${count}`);
    console.log(`💰 Total portfolio value: $${totalValue.toFixed(2)}`);
    console.log('🎯 Dashboard should now show: BNB, DOT, and BTC positions');
}

createDashboardPositions()
    .catch(console.error)
    .finally(() => prisma.$disconnect());