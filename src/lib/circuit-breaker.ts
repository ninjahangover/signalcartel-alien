/**
 * Circuit Breaker Pattern for API Reliability
 * Prevents cascade failures and implements intelligent fallback behavior
 */

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
}

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, rejecting requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private successCount: number = 0;

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.config.recoveryTimeout) {
        console.log('🔄 Circuit Breaker: Moving to HALF_OPEN state for testing');
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        if (fallback) {
          console.log('⚡ Circuit Breaker: OPEN - using fallback');
          return await fallback();
        }
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();

      if (fallback && this.state === CircuitState.OPEN) {
        console.log('⚡ Circuit Breaker: Using fallback after failure');
        return await fallback();
      }

      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= 3) { // Require 3 successes to fully recover
        console.log('✅ Circuit Breaker: Recovered - moving to CLOSED state');
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      console.log(`🚨 Circuit Breaker: OPENING - ${this.failureCount} failures detected`);
      this.state = CircuitState.OPEN;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats(): { state: CircuitState; failureCount: number; lastFailureTime: number } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.successCount = 0;
    console.log('🔄 Circuit Breaker: Manually reset to CLOSED state');
  }
}

// Global circuit breakers for different services
export const krakenApiCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,      // Open after 5 failures
  recoveryTimeout: 30000,   // Wait 30s before testing recovery
  monitoringPeriod: 60000   // Monitor over 1 minute windows
});

export const balanceApiCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,      // More sensitive for balance calls
  recoveryTimeout: 60000,   // Wait 1 minute before testing
  monitoringPeriod: 300000  // Monitor over 5 minute windows
});