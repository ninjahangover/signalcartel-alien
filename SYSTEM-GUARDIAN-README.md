# 🛡️ SYSTEM GUARDIAN - Trading System Heartbeat Monitor

## Overview

**System Guardian** is a critical production service that ensures your trading system stays operational 24/7. It automatically detects crashes, stalls, and system failures, then restarts the trading system to prevent financial losses from unmanaged positions.

## 🚨 **CRITICAL IMPORTANCE FOR TRADING**

**Why This Is Essential:**
- **Open Positions Risk**: Unmanaged positions can cause massive losses during market volatility
- **System Crashes**: The trading system occasionally crashes and needs automatic restart
- **Stall Detection**: System can appear running but actually be stalled/frozen
- **24/7 Operation**: Trading happens around the clock, you can't monitor manually
- **Financial Protection**: Automatic recovery prevents costly position management failures

## 🎯 **Key Features**

### **Intelligent Health Monitoring**
- **Process Detection**: Monitors if main trading process is running
- **Log Activity**: Checks for recent system activity (detects stalls)
- **Position Awareness**: Only restarts if positions need management
- **30-Second Checks**: Frequent monitoring without system overhead

### **Smart Restart Logic**
- **Automatic Recovery**: Restarts failed systems without human intervention
- **Cooldown Periods**: Prevents restart loops (5-minute cooldown between attempts)
- **Exponential Backoff**: Intelligent retry strategy for persistent failures
- **Maximum Attempts**: Escalates to alerts after 5 failed restart attempts

### **Production Safety Features**
- **Position-Aware**: Only restarts when positions actually need management
- **Graceful Process Handling**: Proper cleanup of existing processes before restart
- **Full Environment**: Restarts with complete trading environment (GPU, database, etc.)
- **Log Preservation**: Maintains detailed incident logs for analysis

### **Alert Integration**
- **ntfy Integration**: Sends notifications to your configured topic
- **Graduated Alerts**: Info → Warning → Error → Critical escalation
- **Failure Notifications**: Alerts on restart attempts and failures
- **Critical Escalation**: Manual intervention alerts when auto-restart fails

## 🚀 **Quick Start**

### **Start System Guardian**
```bash
# Start monitoring service
./start-system-guardian.sh

# Check status
tail -f /tmp/signalcartel-logs/system-guardian.log
```

### **Stop System Guardian**
```bash
# Stop monitoring service
./stop-system-guardian.sh
```

### **Check System Status**
```bash
# View recent guardian activity
tail -20 /tmp/signalcartel-logs/system-guardian.log

# Check if guardian is running
ps aux | grep system-guardian | grep -v grep

# Monitor real-time activity
tail -f /tmp/signalcartel-logs/system-guardian.log
```

## 📊 **How It Works**

### **Health Check Cycle (Every 30 Seconds)**

1. **Process Check**: Is `production-trading-multi-pair.ts` running?
2. **Log Activity**: Has the system logged activity in last 2 minutes?
3. **Position Check**: Are there open positions needing management?
4. **Decision Logic**: Restart if process dead OR system stalled

### **Restart Sequence**

1. **Failure Detection**: System identified as failed
2. **Cooldown Check**: Ensure 5 minutes since last restart
3. **Process Cleanup**: Kill any hanging processes
4. **Environment Restart**: Launch with full trading environment
5. **Success Verification**: Confirm new process started
6. **Notification**: Send appropriate alerts

### **Escalation Process**

- **Attempts 1-5**: Automatic restart with increasing delays
- **Attempt 6+**: Critical alert sent, manual intervention required
- **Recovery**: Success resets failure counter

## 🔧 **Configuration**

### **Default Settings**
```typescript
checkInterval: 30000,      // 30 seconds between health checks
maxLogAge: 120000,         // 2 minutes = system considered stalled  
maxRestartAttempts: 5,     // Restart attempts before escalation
restartCooldown: 300000,   // 5 minutes between restart attempts
ntfyTopic: 'signal-cartel' // Your notification topic
```

### **Environment Variables**
```bash
NTFY_TOPIC="signal-cartel"  # Your notification topic
```

## 📱 **Alert Types**

### **Info Alerts**
- `🛡️ SYSTEM GUARDIAN ONLINE` - Service started
- System status updates

### **Warning Alerts**  
- `🔄 SYSTEM RESTARTED` - Successful automatic restart
- Single failure recovery notifications

### **Critical Alerts**
- `🚨 CRITICAL SYSTEM FAILURE` - Manual intervention required
- Multiple restart failures
- System unable to recover automatically

## 📋 **Log Files**

### **Guardian Logs**
- **Location**: `/tmp/signalcartel-logs/system-guardian.log`
- **Content**: All guardian activity, health checks, restart attempts
- **Rotation**: Appends continuously (monitor disk space)

### **Startup Logs**
- **Location**: `/tmp/signalcartel-logs/system-guardian-startup.log`
- **Content**: Guardian service startup output and errors
- **Use**: Troubleshooting guardian start failures

### **Trading System Logs**
- **Location**: `/tmp/signalcartel-logs/production-trading.log`
- **Content**: Main trading system activity (monitored by guardian)
- **Use**: Guardian monitors this for activity detection

## 🛠️ **Troubleshooting**

### **Guardian Won't Start**
```bash
# Check startup errors
cat /tmp/signalcartel-logs/system-guardian-startup.log

# Verify TypeScript compilation
npx tsc --noEmit --skipLibCheck system-guardian.ts

# Check permissions
ls -la system-guardian.ts start-system-guardian.sh
```

### **Guardian Not Restarting System**
```bash
# Check guardian health logic
tail -50 /tmp/signalcartel-logs/system-guardian.log | grep "SYSTEM FAILURE"

# Verify database connection
PGPASSWORD=quantum_forge_warehouse_2024 docker exec signalcartel-warehouse psql -U warehouse_user -d signalcartel -c "SELECT COUNT(*) FROM \"ManagedPosition\" WHERE status = 'open'"

# Check process detection
ps aux | grep "production-trading" | grep -v grep
```

### **Too Many Restart Attempts**
```bash
# Check for underlying system issues
tail -100 /tmp/signalcartel-logs/production-trading.log | grep -E "ERROR|FAILED|error"

# Check system resources
free -h
df -h
```

## 🎯 **Production Deployment**

### **Recommended Setup**

1. **Start Guardian First**
   ```bash
   ./start-system-guardian.sh
   ```

2. **Verify Monitoring**
   ```bash
   tail -f /tmp/signalcartel-logs/system-guardian.log
   ```

3. **Test Recovery** (Optional)
   ```bash
   # Kill trading system to test restart
   pkill -f "production-trading-multi-pair.ts"
   
   # Watch guardian detect and restart
   tail -f /tmp/signalcartel-logs/system-guardian.log
   ```

### **System Integration**

- **Startup Order**: Start Guardian → Trading System auto-starts
- **Shutdown Order**: Stop Guardian → Stop Trading System  
- **Monitoring**: Guardian handles all system monitoring
- **Alerts**: Configure ntfy topic for notifications

## 🔒 **Security Considerations**

- **Process Management**: Guardian only manages trading system processes
- **Database Access**: Read-only database queries for position checking
- **Network**: Only outbound connections for ntfy alerts
- **Privileges**: Runs with same privileges as trading system

## 📈 **Performance Impact**

- **CPU**: Minimal (health checks every 30 seconds)
- **Memory**: ~50MB RAM usage
- **Network**: Minimal (only for alerts)
- **Disk**: Continuous log writing (monitor space)

## ✅ **Success Indicators**

```
[2025-09-10T18:31:41.277Z] 🛡️ SYSTEM GUARDIAN STARTED - Monitoring trading system health
[2025-09-10T18:31:41.673Z] 🚨 SYSTEM FAILURE DETECTED at 2025-09-10T18:31:41.557Z:
[2025-09-10T18:31:41.674Z] 🔄 ATTEMPTING RESTART #1
[2025-09-10T18:31:43.707Z] ✅ RESTART SUCCESSFUL - Trading system operational
```

This shows the guardian successfully detected a failure and restarted the trading system automatically.

---

## 🎯 **Critical Reminders**

⚠️ **ALWAYS RUN SYSTEM GUARDIAN IN PRODUCTION**
⚠️ **Monitor ntfy alerts for system health**
⚠️ **Check guardian logs daily for any issues**
⚠️ **Test restart functionality regularly**
⚠️ **Keep disk space available for logs**

**The System Guardian is your safety net against costly trading system failures!**