/**
 * TradingView Webhook Payload Adapter
 * Converts SignalCartel internal signals to TradingView-compatible webhook format
 */

interface SignalCartelSignal {
  strategy: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  price: number;
  confidence: number;
  quantity?: number;
  timestamp: Date;
}

interface TradingViewWebhookPayload {
  passphrase: string;
  ticker: string;
  strategy: {
    order_action: string;
    order_type: string;
    order_price: string;
    order_contracts: string;
    type: string;
    volume: string;
    pair: string;
    validate: string;
    close: {
      order_type: string;
      price: string;
    };
    stop_loss: string;
  };
}

export class WebhookPayloadAdapter {
  private passphrase: string;
  private webhookUrl: string;

  constructor(passphrase: string, webhookUrl = 'https://kraken.circuitcartel.com/webhook') {
    this.passphrase = passphrase;
    this.webhookUrl = webhookUrl;
  }

  /**
   * Convert SignalCartel signal to TradingView webhook payload format
   */
  private convertSignalToWebhookPayload(signal: SignalCartelSignal, quantity: number): TradingViewWebhookPayload {
    const action = signal.action.toLowerCase(); // 'buy' or 'sell'
    const price = signal.price.toFixed(2);
    const volume = quantity.toFixed(8);
    
    // Calculate 1.5% stop loss (more conservative than 1%)
    const stopLossMultiplier = action === 'buy' ? 0.985 : 1.015; // 1.5% stop loss
    const stopLossPrice = (signal.price * stopLossMultiplier).toFixed(2);

    return {
      passphrase: this.passphrase,
      ticker: signal.symbol,
      strategy: {
        order_action: action,
        order_type: 'market', // Use market orders for immediate execution
        order_price: price,
        order_contracts: volume,
        type: action,
        volume: volume,
        pair: signal.symbol,
        validate: 'false', // Real trading
        close: {
          order_type: 'limit',
          price: price
        },
        stop_loss: stopLossPrice
      }
    };
  }

  /**
   * Send webhook payload to the webhook service
   */
  async sendWebhook(signal: SignalCartelSignal, quantity: number): Promise<{ success: boolean; response?: any; error?: string }> {
    try {
      const payload = this.convertSignalToWebhookPayload(signal, quantity);
      
      console.log(`🔗 WEBHOOK: Sending ${signal.action} signal for ${signal.symbol}`, {
        strategy: signal.strategy,
        action: signal.action,
        price: signal.price,
        quantity: quantity,
        confidence: signal.confidence
      });

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`🚨 WEBHOOK FAILED: ${response.status} - ${errorText}`);
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`
        };
      }

      const responseData = await response.json();
      console.log(`✅ WEBHOOK SUCCESS: ${signal.action} ${signal.symbol}`, responseData);
      
      return {
        success: true,
        response: responseData
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`🚨 WEBHOOK ERROR:`, error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Test webhook connectivity
   */
  async testWebhook(): Promise<boolean> {
    const testSignal: SignalCartelSignal = {
      strategy: 'test-strategy',
      symbol: 'BTCUSD',
      action: 'BUY',
      price: 50000,
      confidence: 0.75,
      timestamp: new Date()
    };

    // Send with validate=true for testing
    const originalUrl = this.webhookUrl;
    
    try {
      const result = await this.sendWebhook(testSignal, 0.001);
      return result.success;
    } catch (error) {
      console.error('Webhook test failed:', error);
      return false;
    }
  }
}