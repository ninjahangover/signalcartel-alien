#!/bin/bash

# 🔄 V3.14.24 Capital Rotation Monitor
# Real-time dashboard showing position rotations and system performance

echo "🚀 Launching V3.14.24 Capital Rotation Monitor..."
echo ""

# Set database connection
export DATABASE_URL="postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public"

# Launch the monitor
npx tsx admin/monitor-rotation.ts
