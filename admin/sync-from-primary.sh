#!/bin/bash

# Sync database from primary (dev1) to failover (dev2)
# Used when failover needs to take over

echo "🔄 Syncing database from primary..."

PRIMARY_HOST="${PRIMARY_HOST:-dev1.local}"
PRIMARY_DB="postgresql://warehouse_user:quantum_forge_warehouse_2024@${PRIMARY_HOST}:5433/signalcartel?schema=public"
LOCAL_DB="postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public"

# Dump positions and trades from primary
echo "📥 Fetching positions from primary..."
pg_dump "$PRIMARY_DB" -t positions -t trades -t exit_strategies --data-only > /tmp/primary_dump.sql

# Apply to local database
echo "📤 Applying to local database..."
psql "$LOCAL_DB" < /tmp/primary_dump.sql

echo "✅ Database sync complete"

# Also sync any critical state files
echo "🔄 Syncing state files..."
rsync -avz ${PRIMARY_HOST}:/tmp/signalcartel-logs/*.log /tmp/signalcartel-logs/ 2>/dev/null || true

echo "✅ Sync from primary complete"