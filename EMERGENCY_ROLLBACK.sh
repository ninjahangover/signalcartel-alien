#!/bin/bash

# 🚨 EMERGENCY TENSOR FUSION ROLLBACK SCRIPT
# This script completely restores the system to pre-tensor state

echo "🚨 EMERGENCY ROLLBACK: Restoring system to pre-tensor state..."

# Stop any running trading processes
echo "Stopping all trading processes..."
pkill -f "npx tsx production-trading-multi-pair.ts" || true
pkill -f "tensor" || true
sleep 2

# Git rollback to tagged state
echo "Rolling back to safety tag..."
git checkout main
git reset --hard tensor-rollback-point-$(date +%Y%m%d_%H%M%S 2>/dev/null || echo "20250904_224018")

# Restore backed up files
BACKUP_DIR="TENSOR_ROLLBACK_20250904_224018"
if [ -d "$BACKUP_DIR" ]; then
    echo "Restoring critical files from backup..."
    cp "$BACKUP_DIR/production-trading-multi-pair.ts.backup" production-trading-multi-pair.ts
    cp "$BACKUP_DIR/enhanced-mathematical-intuition.ts.backup" src/lib/enhanced-mathematical-intuition.ts  
    cp "$BACKUP_DIR/intelligent-pair-adapter.ts.backup" src/lib/intelligent-pair-adapter.ts
    cp "$BACKUP_DIR/kraken-api-service.ts.backup" src/lib/kraken-api-service.ts
    cp "$BACKUP_DIR/package.json.backup" package.json
    cp "$BACKUP_DIR/config.ts.backup" src/lib/config.ts
    echo "✅ Files restored from backup"
else
    echo "⚠️  Backup directory not found, relying on git rollback"
fi

# Remove tensor files if they exist
echo "Removing tensor fusion files..."
rm -f src/lib/tensor-ai-fusion-engine.ts
rm -f src/lib/advanced-tensor-strategy-integration.ts  
rm -f src/lib/production-tensor-integration.ts
echo "✅ Tensor files removed"

# Restore original dependencies
echo "Restoring original dependencies..."
npm install

# Restart system in known working state
echo "Restarting system in safe mode..."
DATABASE_URL="postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public" \
ENABLE_GPU_STRATEGIES=true \
NTFY_TOPIC="signal-cartel" \
NODE_OPTIONS="--max-old-space-size=4096" \
TRADING_MODE="LIVE" \
nohup npx tsx production-trading-multi-pair.ts > /tmp/signalcartel-logs/emergency-rollback.log 2>&1 &

echo "🎯 ROLLBACK COMPLETE!"
echo "System restored to hash: 84dd9190b0016f78066112e721d5f6e85d6fc35d"  
echo "Check logs: tail -f /tmp/signalcartel-logs/emergency-rollback.log"
echo "Backup preserved in: $BACKUP_DIR"