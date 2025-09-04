#!/bin/bash

# Start SignalCartel Heartbeat Service
# This should run alongside your production trading system to provide monitoring

echo "💓 Starting SignalCartel Heartbeat Service"
echo "========================================"

# Set environment variables
export DATABASE_URL="postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public"

# Change to the correct directory
cd /home/telgkb9/depot/current

echo "📊 Heartbeat service will monitor:"
echo "   - Trading system log health (every 30s)"  
echo "   - Database activity and open positions"
echo "   - System performance metrics"
echo "   - Send alerts to SigNoz at http://174.72.187.118:3301"
echo ""
echo "🚨 Alerts will trigger on:"
echo "   - No HEALTH logs for 2+ minutes (CRITICAL)"
echo "   - CRITICAL errors detected (CRITICAL)" 
echo "   - No trading activity for 5+ minutes (CRITICAL)"
echo "   - Multiple system warnings (WARNING)"
echo ""

# Start heartbeat service in background with log output
echo "🚀 Starting heartbeat service..."
npx tsx admin/signalcartel-heartbeat.ts &

HEARTBEAT_PID=$!
echo "💗 Heartbeat service started with PID: $HEARTBEAT_PID"

# Create a simple stop script
cat > /tmp/stop-heartbeat.sh << EOF
#!/bin/bash
echo "🛑 Stopping SignalCartel Heartbeat Service (PID: $HEARTBEAT_PID)"
kill $HEARTBEAT_PID 2>/dev/null
echo "💔 Heartbeat service stopped"
EOF

chmod +x /tmp/stop-heartbeat.sh

echo "📝 To stop the service later, run: /tmp/stop-heartbeat.sh"
echo "📊 Monitor at: http://174.72.187.118:3301"
echo ""
echo "💚 Heartbeat service is now running..."

# Wait for the background process (keeps script running)
wait $HEARTBEAT_PID