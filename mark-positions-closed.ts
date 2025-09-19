/**
 * Mark all positions as closed in database to free up capital
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function markPositionsClosed() {
  console.log('🔄 Marking all positions as closed in database...');

  try {
    const result = await prisma.managedPosition.updateMany({
      where: { status: 'open' },
      data: {
        status: 'closed'
      }
    });

    console.log(`✅ Marked ${result.count} positions as closed`);

    // ManagedTrade table doesn't have status field, skipping
    console.log('🎯 Capital freed - ready for unified system fresh start!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

markPositionsClosed();