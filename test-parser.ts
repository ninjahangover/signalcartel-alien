import * as fs from 'fs';

const logPath = '/tmp/signalcartel-logs/profit-predator.log';
const logData = fs.readFileSync(logPath, 'utf8');
const lines = logData.split('\n').reverse(); // Reverse to get newest first

console.log(`\n📊 PARSING PROFIT PREDATOR LOG`);
console.log(`Total lines: ${lines.length}`);
console.log('=' .repeat(60));

// Find TOP OPPORTUNITIES headers
for (let i = 0; i < Math.min(lines.length, 100); i++) {
  const line = lines[i];
  if (line.includes('TOP OPPORTUNITIES') && line.includes('regardless of size')) {
    console.log(`\n🎯 Found TOP OPPORTUNITIES at line ${i}:`);
    console.log(`   Header: "${line.trim()}"`);

    // Look BACKWARD in reversed array (lines AFTER header in original have LOWER indices)
    console.log('\n   Lines BEFORE header in reversed array (AFTER in original):');
    for (let j = Math.max(0, i - 5); j < i; j++) {
      console.log(`     [${j}]: "${lines[j].trim()}"`);

      // Check if this is an opportunity
      const match = lines[j].match(/(\d+)\.\s+([A-Z][A-Z0-9]*USD[T]?):\s+([\d.]+)%\s+expected,\s+([\d.]+)%\s+win\s+prob/);
      if (match) {
        console.log(`     ✅ FOUND OPPORTUNITY: ${match[2]} at ${match[3]}%`);
      }
    }

    // Look FORWARD in reversed array (lines BEFORE header in original have HIGHER indices)
    console.log('\n   Lines AFTER header in reversed array (BEFORE in original):');
    for (let j = i + 1; j < Math.min(lines.length, i + 6); j++) {
      console.log(`     [${j}]: "${lines[j].trim()}"`);
    }

    break; // Just check the first (most recent) one
  }
}