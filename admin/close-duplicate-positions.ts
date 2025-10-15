/**
 * 🔧 V3.14.6: Close Duplicate ETHUSD Positions
 *
 * Manually delete the 2 duplicate ETHUSD positions from the database.
 * The system will reconcile actual holdings on next startup.
 */

import { prisma } from '../src/lib/prisma';

async function closeDuplicatePositions() {
  console.log('🔧 V3.14.6: Removing duplicate ETHUSD positions from database...\n');

  // Get all ETHUSD positions ordered by creation time
  const ethusdPositions = await prisma.managedPosition.findMany({
    where: {
      status: 'open',
      symbol: 'ETHUSD'
    },
    orderBy: { createdAt: 'asc' } // Oldest first
  });

  console.log(`Found ${ethusdPositions.length} ETHUSD positions:`);
  ethusdPositions.forEach((pos, idx) => {
    const age = ((Date.now() - pos.createdAt.getTime()) / (1000 * 60)).toFixed(1);
    console.log(`  ${idx + 1}. ID: ${pos.id.substring(0, 20)}... | Qty: ${pos.quantity} | Age: ${age}min`);
  });

  if (ethusdPositions.length <= 1) {
    console.log('\n✅ No duplicates found - nothing to remove');
    await prisma.$disconnect();
    return;
  }

  // Keep the oldest (first) position, delete the rest from database
  const toKeep = ethusdPositions[0];
  const toDelete = ethusdPositions.slice(1);

  console.log(`\n📌 KEEPING: ${toKeep.id.substring(0, 20)}... (oldest position)`);
  console.log(`🗑️  DELETING: ${toDelete.length} duplicate positions from database\n`);

  // Delete each duplicate position
  for (const pos of toDelete) {
    try {
      console.log(`🗑️  Deleting ${pos.id.substring(0, 20)}...`);

      await prisma.managedPosition.delete({
        where: { id: pos.id }
      });

      console.log(`   ✅ Removed from database\n`);
    } catch (error) {
      console.error(`   ❌ Error deleting ${pos.id}: ${error.message}\n`);
    }
  }

  console.log('🎯 Summary:');
  console.log(`   Kept: 1 ETHUSD position (oldest)`);
  console.log(`   Deleted: ${toDelete.length} duplicate positions from database`);
  console.log(`   ⚠️  Note: Actual Kraken positions unchanged - system will reconcile on restart`);
  console.log('\n✅ Done!');

  await prisma.$disconnect();
}

closeDuplicatePositions().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
