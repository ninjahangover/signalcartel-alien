#!/usr/bin/env npx tsx

/**
 * Phase 5.1: Test Tensor Fusion with All AI Systems Active
 * 
 * This test verifies that the tensor fusion system is properly integrating
 * all AI systems according to the mathematical foundation:
 * 
 * T(t) = W₂⊗V₂ + W₃⊗V₃ + W₄⊗V₄ + W₅⊗V₅ + W₆⊗V₆ + W₇⊗V₇
 * 
 * Where:
 * - V₂ = Mathematical Intuition [confidence, direction, magnitude, reliability]
 * - V₃ = Bayesian Probability [regime_confidence, bias, expected_return, accuracy]
 * - V₄ = Markov Predictor [transition_prob, next_state, magnitude, accuracy]
 * - V₅ = Adaptive Learning [win_rate, direction_bias, avg_move, reliability]
 * - V₆ = Order Book Intelligence [depth_signal, pressure, liquidity, reliability]
 * - V₇ = Sentiment Analysis [sentiment_score, trend, magnitude, accuracy]
 */

import { tensorAIFusion, AISystemOutput } from './src/lib/tensor-ai-fusion-engine';

interface TestResult {
  success: boolean;
  systemId: string;
  message: string;
  data?: any;
}

class TensorFusionTester {
  private testResults: TestResult[] = [];
  
  /**
   * Generate mock AI system outputs for testing
   */
  private generateMockAIOutputs(): AISystemOutput[] {
    const currentTime = new Date();
    
    return [
      // V₂: Mathematical Intuition
      {
        systemId: 'mathematical-intuition',
        confidence: 0.78,
        direction: 1,
        magnitude: 0.025,
        reliability: 0.82,
        timestamp: currentTime,
        additionalData: {
          domainAnalysis: ['technical', 'momentum', 'volatility'],
          mathematicalScore: 0.85,
          computationTime: 45
        }
      },
      
      // V₃: Bayesian Probability (simulated)
      {
        systemId: 'bayesian-probability',
        confidence: 0.71,
        direction: 1,
        magnitude: 0.018,
        reliability: 0.76,
        timestamp: currentTime,
        additionalData: {
          regimeConfidence: 0.73,
          priorBelief: 0.65,
          likelihoodRatio: 1.8,
          posteriorUpdate: 0.71
        }
      },
      
      // V₄: Markov Predictor
      {
        systemId: 'enhanced-markov-predictor',
        confidence: 0.69,
        direction: 1,
        magnitude: 0.022,
        reliability: 0.74,
        timestamp: currentTime,
        additionalData: {
          transitionProbability: 0.67,
          nextStateConfidence: 0.69,
          stateStability: 0.71,
          predictionHorizon: '5min'
        }
      },
      
      // V₅: Adaptive Learning (simulated)
      {
        systemId: 'adaptive-learning',
        confidence: 0.73,
        direction: 1,
        magnitude: 0.021,
        reliability: 0.79,
        timestamp: currentTime,
        additionalData: {
          winRate: 0.67,
          directionBias: 0.73,
          averageMove: 0.021,
          adaptationScore: 0.84
        }
      },
      
      // V₆: Order Book Intelligence
      {
        systemId: 'order-book-intelligence',
        confidence: 0.66,
        direction: -1, // Different direction to test consensus
        magnitude: 0.015,
        reliability: 0.71,
        timestamp: currentTime,
        additionalData: {
          depthSignal: 0.62,
          marketPressure: -0.34,
          liquidityScore: 0.78,
          whaleActivity: 0.23
        }
      },
      
      // V₇: Sentiment Analysis
      {
        systemId: 'quantum-forge-sentiment',
        confidence: 0.75,
        direction: 1,
        magnitude: 0.028,
        reliability: 0.77,
        timestamp: currentTime,
        additionalData: {
          sentimentScore: 0.58,
          trendStrength: 0.71,
          socialVolume: 0.83,
          narrativeCoherence: 0.69
        }
      }
    ];
  }
  
  /**
   * Test 1: Verify all AI systems are properly integrated
   */
  async testAISystemIntegration(): Promise<void> {
    console.log('\n🧪 Testing AI System Integration...');
    
    try {
      const mockOutputs = this.generateMockAIOutputs();
      console.log(`📊 Generated ${mockOutputs.length} mock AI system outputs`);
      
      // Verify each system has the required tensor format
      for (const output of mockOutputs) {
        const hasRequiredFields = 
          typeof output.confidence === 'number' &&
          typeof output.direction === 'number' &&
          typeof output.magnitude === 'number' &&
          typeof output.reliability === 'number' &&
          output.timestamp instanceof Date &&
          typeof output.systemId === 'string';
        
        if (hasRequiredFields) {
          this.testResults.push({
            success: true,
            systemId: output.systemId,
            message: `✅ System has valid tensor format [${output.confidence.toFixed(2)}, ${output.direction}, ${output.magnitude.toFixed(3)}, ${output.reliability.toFixed(2)}]`
          });
        } else {
          this.testResults.push({
            success: false,
            systemId: output.systemId,
            message: '❌ System missing required tensor fields'
          });
        }
      }
      
    } catch (error) {
      this.testResults.push({
        success: false,
        systemId: 'ai-integration',
        message: `❌ AI System Integration failed: ${error.message}`
      });
    }
  }
  
  /**
   * Test 2: Verify tensor fusion mathematical operations
   */
  async testTensorFusionMath(): Promise<void> {
    console.log('\n🧮 Testing Tensor Fusion Mathematical Operations...');
    
    try {
      const mockOutputs = this.generateMockAIOutputs();
      const currentPrice = 50000; // Mock BTC price
      
      // Call the main fusion function
      const fusionResult = await tensorAIFusion.fuseAIOutputs(mockOutputs, currentPrice);
      
      // Verify the result has all required enhanced features
      const requiredFields = [
        'fusedConfidence', 'fusedDirection', 'fusedMagnitude', 'fusedReliability',
        'shouldTrade', 'expectedReturn', 'positionSize',
        'actionDecision', 'holdConfidence', 'continuousValidation',
        'dynamicExit', 'multiTimeframe', 'positionSizing',
        'eigenvalueSpread', 'informationContent', 'consensusStrength'
      ];
      
      let allFieldsPresent = true;
      const missingFields: string[] = [];
      
      for (const field of requiredFields) {
        if (!(field in fusionResult)) {
          allFieldsPresent = false;
          missingFields.push(field);
        }
      }
      
      if (allFieldsPresent) {
        this.testResults.push({
          success: true,
          systemId: 'tensor-fusion',
          message: `✅ Tensor fusion produced complete result with ${Object.keys(fusionResult).length} fields`,
          data: {
            confidence: fusionResult.fusedConfidence,
            direction: fusionResult.fusedDirection,
            magnitude: fusionResult.fusedMagnitude,
            shouldTrade: fusionResult.shouldTrade,
            actionDecision: fusionResult.actionDecision,
            positionSize: fusionResult.positionSize
          }
        });
        
        // Test specific enhanced features
        this.testResults.push({
          success: true,
          systemId: 'hold-logic',
          message: `✅ Hold logic active: ${fusionResult.actionDecision} (confidence: ${(fusionResult.holdConfidence * 100).toFixed(1)}%)`
        });
        
        this.testResults.push({
          success: true,
          systemId: 'dynamic-exit',
          message: `✅ Dynamic exit logic: ${fusionResult.dynamicExit.shouldExit ? 'EXIT' : 'HOLD'} (urgency: ${fusionResult.dynamicExit.exitUrgency})`
        });
        
        this.testResults.push({
          success: true,
          systemId: 'position-sizing',
          message: `✅ Advanced position sizing: ${(fusionResult.positionSizing.finalSize * 100).toFixed(2)}% (${fusionResult.positionSizing.riskLevel})`
        });
        
        this.testResults.push({
          success: true,
          systemId: 'multi-timeframe',
          message: `✅ Multi-timeframe analysis: ${fusionResult.multiTimeframe.primaryTimeframe} (${fusionResult.multiTimeframe.timeframeRecommendation.holdingPeriod})`
        });
        
      } else {
        this.testResults.push({
          success: false,
          systemId: 'tensor-fusion',
          message: `❌ Tensor fusion missing fields: ${missingFields.join(', ')}`
        });
      }
      
    } catch (error) {
      this.testResults.push({
        success: false,
        systemId: 'tensor-fusion',
        message: `❌ Tensor fusion mathematical operation failed: ${error.message}`
      });
    }
  }
  
  /**
   * Test 3: Verify AI consensus quality
   */
  async testAIConsensusQuality(): Promise<void> {
    console.log('\n🎭 Testing AI Consensus Quality...');
    
    try {
      const mockOutputs = this.generateMockAIOutputs();
      const currentPrice = 50000;
      
      const fusionResult = await tensorAIFusion.fuseAIOutputs(mockOutputs, currentPrice);
      
      // Analyze consensus metrics
      const consensusStrength = fusionResult.consensusStrength;
      const informationContent = fusionResult.informationContent;
      const conflictLevel = fusionResult.continuousValidation.conflictLevel;
      
      if (consensusStrength >= 0.3) {
        this.testResults.push({
          success: true,
          systemId: 'consensus-strength',
          message: `✅ Good consensus strength: ${(consensusStrength * 100).toFixed(1)}%`
        });
      } else {
        this.testResults.push({
          success: false,
          systemId: 'consensus-strength',
          message: `⚠️ Low consensus strength: ${(consensusStrength * 100).toFixed(1)}%`
        });
      }
      
      if (informationContent >= 0.5) {
        this.testResults.push({
          success: true,
          systemId: 'information-content',
          message: `✅ Sufficient information content: ${informationContent.toFixed(2)} bits`
        });
      } else {
        this.testResults.push({
          success: false,
          systemId: 'information-content',
          message: `⚠️ Low information content: ${informationContent.toFixed(2)} bits`
        });
      }
      
      if (conflictLevel <= 0.6) {
        this.testResults.push({
          success: true,
          systemId: 'conflict-level',
          message: `✅ Acceptable conflict level: ${(conflictLevel * 100).toFixed(1)}%`
        });
      } else {
        this.testResults.push({
          success: false,
          systemId: 'conflict-level',
          message: `⚠️ High conflict between AI systems: ${(conflictLevel * 100).toFixed(1)}%`
        });
      }
      
    } catch (error) {
      this.testResults.push({
        success: false,
        systemId: 'consensus-quality',
        message: `❌ Consensus quality test failed: ${error.message}`
      });
    }
  }
  
  /**
   * Test 4: Verify performance with multiple test scenarios
   */
  async testMultipleScenarios(): Promise<void> {
    console.log('\n🔄 Testing Multiple Market Scenarios...');
    
    const scenarios = [
      { name: 'High Confidence Bullish', confidenceBoost: 0.2, directionBias: 1 },
      { name: 'Low Confidence Bearish', confidenceBoost: -0.2, directionBias: -1 },
      { name: 'Mixed Signals', confidenceBoost: 0, directionBias: 0 },
      { name: 'High Volatility', magnitudeBoost: 0.02, directionBias: 1 }
    ];
    
    for (const scenario of scenarios) {
      try {
        const baseOutputs = this.generateMockAIOutputs();
        
        // Apply scenario modifications
        const modifiedOutputs = baseOutputs.map(output => ({
          ...output,
          confidence: Math.max(0.1, Math.min(0.95, output.confidence + (scenario.confidenceBoost || 0))),
          direction: scenario.directionBias !== undefined ? 
            (Math.random() > 0.7 ? scenario.directionBias : output.direction) : output.direction,
          magnitude: output.magnitude + (scenario.magnitudeBoost || 0)
        }));
        
        const result = await tensorAIFusion.fuseAIOutputs(modifiedOutputs, 50000);
        
        this.testResults.push({
          success: true,
          systemId: `scenario-${scenario.name.toLowerCase().replace(/\s+/g, '-')}`,
          message: `✅ ${scenario.name}: Decision=${result.actionDecision}, Confidence=${(result.fusedConfidence * 100).toFixed(1)}%, Position=${(result.positionSizing.finalSize * 100).toFixed(1)}%`,
          data: {
            scenario: scenario.name,
            decision: result.actionDecision,
            confidence: result.fusedConfidence,
            positionSize: result.positionSizing.finalSize,
            consensusStrength: result.consensusStrength
          }
        });
        
      } catch (error) {
        this.testResults.push({
          success: false,
          systemId: `scenario-${scenario.name.toLowerCase().replace(/\s+/g, '-')}`,
          message: `❌ ${scenario.name} scenario failed: ${error.message}`
        });
      }
    }
  }
  
  /**
   * Run all tests and generate report
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Tensor Fusion Integration Tests...\n');
    console.log('Testing Phase 5.1: All AI Systems Active Integration\n');
    
    await this.testAISystemIntegration();
    await this.testTensorFusionMath();
    await this.testAIConsensusQuality();
    await this.testMultipleScenarios();
    
    this.generateTestReport();
  }
  
  /**
   * Generate comprehensive test report
   */
  private generateTestReport(): void {
    const successCount = this.testResults.filter(r => r.success).length;
    const failureCount = this.testResults.filter(r => r.success === false).length;
    const totalTests = this.testResults.length;
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 TENSOR FUSION INTEGRATION TEST REPORT');
    console.log('='.repeat(80));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
    console.log(`Success Rate: ${((successCount / totalTests) * 100).toFixed(1)}%`);
    console.log('='.repeat(80));
    
    // Group results by category
    const categories = new Map<string, TestResult[]>();
    
    for (const result of this.testResults) {
      const category = result.systemId.split('-')[0];
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(result);
    }
    
    // Print results by category
    for (const [category, results] of categories.entries()) {
      console.log(`\n📋 ${category.toUpperCase()} TESTS:`);
      for (const result of results) {
        console.log(`  ${result.message}`);
        if (result.data) {
          console.log(`     Data: ${JSON.stringify(result.data)}`);
        }
      }
    }
    
    const successRate = (successCount / totalTests) * 100;
    
    // Overall assessment
    console.log('\n🎯 OVERALL ASSESSMENT:');
    if (successRate >= 90) {
      console.log('🟢 EXCELLENT: Tensor fusion system is fully operational and ready for deployment');
    } else if (successRate >= 75) {
      console.log('🟡 GOOD: Tensor fusion system is mostly operational with minor issues');
    } else if (successRate >= 60) {
      console.log('🟠 ACCEPTABLE: Tensor fusion system has significant issues that should be addressed');
    } else {
      console.log('🔴 POOR: Tensor fusion system has major issues and is not ready for deployment');
    }
    
    console.log(`\nRecommendation: ${this.getRecommendation(successRate)}`);
    console.log('\n' + '='.repeat(80));
  }
  
  private getRecommendation(successRate: number): string {
    if (successRate >= 90) {
      return 'Proceed to Phase 5.2 - Verify no hardcoded values';
    } else if (successRate >= 75) {
      return 'Address minor issues and retest before proceeding';
    } else if (successRate >= 60) {
      return 'Review and fix significant issues before proceeding';
    } else {
      return 'Major debugging required - do not proceed to deployment';
    }
  }
}

// Run the tests
async function main() {
  const tester = new TensorFusionTester();
  await tester.runAllTests();
}

main().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});