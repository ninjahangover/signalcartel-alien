#!/bin/bash

echo "Testing Kraken Proxy with Spot Account..."

curl -X POST http://localhost:3002/api/kraken-proxy \
  -H "Content-Type: application/json" \
  -d "{
    \"endpoint\": \"/0/private/Balance\",
    \"params\": {},
    \"apiKey\": \"DX6cOR0oDiBFem9c7M1aFhKBABAICZAI1VSynPJsCFWvAwmakDUfpElR\",
    \"apiSecret\": \"p/1Cuz63DpXBANzU1rM6yinTccji0PNaGTf5OnwweaY1P4TPs0pDbvlT6xqxt40KJMuO30paUo/JNeppV57cWg==\"
  }"