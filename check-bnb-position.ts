import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBNBPosition() {
  try {
    const bnbPositions = await prisma.managedPosition.findMany({
      where: {
        symbol: 'BNBUSD',
        status: 'open'
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('BNB Positions:');
    bnbPositions.forEach(pos => {
      console.log(`ID: ${pos.id}`);
      console.log(`Entry Price: $${pos.entryPrice}`);
      console.log(`Quantity: ${pos.quantity}`);
      console.log(`Side: ${pos.side}`);
      console.log(`Created: ${pos.createdAt}`);
      console.log('---');
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBNBPosition();