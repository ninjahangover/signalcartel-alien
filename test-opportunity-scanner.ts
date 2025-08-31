/**
 * Test the QUANTUM FORGE™ Pair Opportunity Scanner
 * This will scan the market for the best trading opportunities
 */

import { pairOpportunityScanner } from './src/lib/quantum-forge-pair-opportunity-scanner';

async function testOpportunityScanner() {
  console.log('🚀 QUANTUM FORGE™ Pair Opportunity Scanner - TEST RUN');
  console.log('🔍 Scanning for exponential wealth opportunities...');

  try {
    // Run a market scan
    const opportunities = await pairOpportunityScanner.scanAllPairs();
    
    console.log(`\\n📊 SCAN RESULTS:`);
    console.log(`   Total Opportunities: ${opportunities.length}`);
    
    if (opportunities.length > 0) {
      // Show top 10 opportunities
      const top10 = opportunities.slice(0, 10);
      
      console.log(`\\n🏆 TOP 10 OPPORTUNITIES:`);
      console.log(`   ${'Rank'.padEnd(4)} ${'Symbol'.padEnd(8)} ${'Score'.padEnd(6)} ${'Conf%'.padEnd(6)} ${'Action'.padEnd(12)} ${'Urgency'.padEnd(8)} ${'Risk'.padEnd(6)}`);
      console.log(`   ${'----'.padEnd(4)} ${'------'.padEnd(8)} ${'-----'.padEnd(6)} ${'----'.padEnd(6)} ${'----------'.padEnd(12)} ${'-------'.padEnd(8)} ${'----'.padEnd(6)}`);
      
      top10.forEach((opp, index) => {
        console.log(`   ${(index + 1).toString().padEnd(4)} ${opp.symbol.padEnd(8)} ${opp.opportunityScore.toFixed(1).padEnd(6)} ${opp.confidence.toFixed(1).padEnd(6)} ${opp.recommendation.action.padEnd(12)} ${opp.recommendation.urgency.padEnd(8)} ${opp.risk.toFixed(1).padEnd(6)}`);
      });

      // Show detailed analysis for top opportunity
      const topOpp = opportunities[0];
      console.log(`\\n🎯 DETAILED ANALYSIS - ${topOpp.symbol}:`);
      console.log(`   📈 Opportunity Score: ${topOpp.opportunityScore.toFixed(1)}/100`);
      console.log(`   🎯 Confidence: ${topOpp.confidence.toFixed(1)}%`);
      console.log(`   ⚠️  Risk Level: ${topOpp.risk.toFixed(1)}/100`);
      console.log(`   💡 Opportunity Type: ${topOpp.llmAssessment.opportunityType}`);
      console.log(`   ⏱️  Time Horizon: ${topOpp.llmAssessment.timeHorizon}`);
      console.log(`   🎪 Recommended Action: ${topOpp.recommendation.action}`);
      console.log(`   💰 Position Size: ${(topOpp.recommendation.positionSize * 100).toFixed(1)}%`);
      console.log(`   🚨 Urgency: ${topOpp.recommendation.urgency}`);
      console.log(`   🛡️  Stop Loss: ${(topOpp.recommendation.stopLoss * 100).toFixed(1)}%`);
      console.log(`   🎯 Take Profit: ${(topOpp.recommendation.takeProfit * 100).toFixed(1)}%`);
      
      if (topOpp.llmAssessment.reasoning.length > 0) {
        console.log(`   🧠 AI Reasoning:`);
        topOpp.llmAssessment.reasoning.forEach((reason, index) => {
          console.log(`      ${index + 1}. ${reason}`);
        });
      }

      // Show distribution of recommendations
      const actionCounts = opportunities.reduce((counts, opp) => {
        counts[opp.recommendation.action] = (counts[opp.recommendation.action] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);

      console.log(`\\n📊 RECOMMENDATION DISTRIBUTION:`);
      Object.entries(actionCounts).forEach(([action, count]) => {
        const percentage = ((count / opportunities.length) * 100).toFixed(1);
        console.log(`   ${action}: ${count} (${percentage}%)`);
      });

      // Show urgency distribution
      const urgencyCounts = opportunities.reduce((counts, opp) => {
        counts[opp.recommendation.urgency] = (counts[opp.recommendation.urgency] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);

      console.log(`\\n⏱️ URGENCY DISTRIBUTION:`);
      Object.entries(urgencyCounts).forEach(([urgency, count]) => {
        const percentage = ((count / opportunities.length) * 100).toFixed(1);
        console.log(`   ${urgency}: ${count} (${percentage}%)`);
      });

      // Filter for immediate action opportunities
      const immediateOpps = opportunities.filter(o => o.recommendation.urgency === 'IMMEDIATE' || 
        (o.recommendation.urgency === 'HIGH' && ['STRONG_BUY', 'BUY'].includes(o.recommendation.action)));

      if (immediateOpps.length > 0) {
        console.log(`\\n🚨 IMMEDIATE ACTION OPPORTUNITIES (${immediateOpps.length}):`);
        immediateOpps.slice(0, 5).forEach(opp => {
          console.log(`   🎯 ${opp.symbol}: Score ${opp.opportunityScore.toFixed(1)} | ${opp.recommendation.action} | ${opp.recommendation.urgency}`);
        });
      }

      // Export results for further analysis
      const report = await pairOpportunityScanner.exportOpportunities();
      console.log(`\\n📋 Full analysis exported (${report.length} characters)`);

    } else {
      console.log('⚠️  No opportunities found in current market conditions');
    }

    console.log(`\\n✅ Opportunity scanner test completed successfully!`);

  } catch (error) {
    console.error('❌ Scanner test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testOpportunityScanner().catch(console.error);
}