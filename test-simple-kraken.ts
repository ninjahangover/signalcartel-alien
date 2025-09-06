#!/usr/bin/env node

import * as crypto from 'crypto';
import * as https from 'https';
import * as querystring from 'querystring';

async function getKrakenBalance() {
  const apiKey = process.env.KRAKEN_API_KEY;
  const apiSecret = process.env.KRAKEN_PRIVATE_KEY;
  
  if (!apiKey || !apiSecret) {
    throw new Error('Missing KRAKEN_API_KEY or KRAKEN_PRIVATE_KEY');
  }
  
  const path = '/0/private/Balance';
  const nonce = Date.now() * 1000;
  const postData = querystring.stringify({ nonce });
  
  // Create signature
  const message = nonce + postData;
  const hash = crypto.createHash('sha256').update(message).digest();
  const signature = crypto
    .createHmac('sha512', Buffer.from(apiSecret, 'base64'))
    .update(path + hash, 'binary')
    .digest('base64');
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.kraken.com',
      path: path,
      method: 'POST',
      headers: {
        'API-Key': apiKey,
        'API-Sign': signature,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.error && response.error.length > 0) {
            reject(new Error(`Kraken API Error: ${response.error.join(', ')}`));
          } else {
            resolve(response);
          }
        } catch (err) {
          reject(err);
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  try {
    console.log('🔍 Testing simple Kraken API call...');
    const result = await getKrakenBalance() as any;
    console.log('✅ Success!');
    console.log('Balance:', result.result);
    
    if (result.result && result.result.ZUSD) {
      const usdBalance = parseFloat(result.result.ZUSD);
      console.log(`💰 USD Balance: $${usdBalance.toFixed(2)}`);
    }
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
  }
}

main();