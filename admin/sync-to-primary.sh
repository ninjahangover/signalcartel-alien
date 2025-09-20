#!/bin/bash

# Sync database from failover (dev2) back to primary (dev1)
# Used when primary comes back online

echo "🔄 Syncing database back to primary..."

PRIMARY_HOST="${PRIMARY_HOST:-dev1.local}"
PRIMARY_DB="postgresql://warehouse_user:quantum_forge_warehouse_2024@${PRIMARY_HOST}:5433/signalcartel?schema=public"
LOCAL_DB="postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public"

# Dump our current state
echo "📥 Preparing local state..."
pg_dump "$LOCAL_DB" -t positions -t trades -t exit_strategies --data-only > /tmp/failover_dump.sql

# Send back to primary
echo "📤 Sending to primary..."
psql "$PRIMARY_DB" < /tmp/failover_dump.sql

echo "✅ Database sync back to primary complete"

# Sync logs back
echo "🔄 Syncing logs back..."
rsync -avz /tmp/signalcartel-logs/*.log ${PRIMARY_HOST}:/tmp/signalcartel-logs/ 2>/dev/null || true

echo "✅ Sync to primary complete"