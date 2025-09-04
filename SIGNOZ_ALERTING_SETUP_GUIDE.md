# 🚨 SigNoz Alerting System Setup Guide

## ✅ **SETUP COMPLETE**

Your SignalCartel alerting system is ready to deploy! This guide shows you how to set up comprehensive monitoring and alerting for your trading system.

### 🎯 **What You Get**

- **🚨 Critical Alerts**: Service down, system failures, no trading activity
- **⚠️ Warning Alerts**: System warnings, repeated errors, API rate limits  
- **💚 Health Monitoring**: Continuous system health checks every 30 seconds
- **📊 Log-Based Monitoring**: No OpenTelemetry complexity - uses production telemetry

## 🚀 **Quick Start**

### 1. **Start the Heartbeat Service**

```bash
# Start heartbeat monitoring alongside your trading system
./admin/start-heartbeat-service.sh &

# Or start in the background and continue
nohup ./admin/start-heartbeat-service.sh > /tmp/heartbeat.log 2>&1 &
```

### 2. **Test the Heartbeat System**

```bash
# Run a 2-minute test to verify it works
./admin/test-heartbeat.sh
```

Expected output:
```
💚 System Health: HEALTHY
📊 Trades in last 10min: X
🔢 Open positions: X
💻 SYSTEM logs sent to SigNoz
```

### 3. **Configure SigNoz Alerts**

1. **Access SigNoz Dashboard**: http://174.72.187.118:3301
2. **Go to Alerts** → Create Alert Rules
3. **Import the rules** from `admin/signoz-alert-rules.yaml`

## 📊 **Alert Rules Overview**

### 🚨 **CRITICAL ALERTS**

| Alert | Trigger | Description |
|-------|---------|-------------|
| **Service Down** | No HEALTH logs for 2+ minutes | Heartbeat service crashed |
| **System Critical** | CRITICAL error logs detected | Major system failure |
| **Trading Down** | No TRADE/POSITION logs for 5+ minutes | Trading system inactive |

### ⚠️ **WARNING ALERTS**

| Alert | Trigger | Description |
|-------|---------|-------------|
| **System Warning** | 3+ WARNING logs in 10 minutes | System health issues |
| **Repeated Errors** | 5+ ERROR logs in 15 minutes | Recurring system errors |
| **API Rate Limits** | 10+ rate limit errors in 10 minutes | API throttling detected |

## 🔧 **SigNoz Alert Rule Examples**

### Critical Service Down Alert
```yaml
- alert: SignalCartel_Service_Down
  query: 'count(logs) where service_name="signalcartel-heartbeat" AND body contains "HEALTH" in last 2m'
  condition: '< 1'
  labels:
    severity: critical
    service: signalcartel
  annotations:
    title: "🚨 SignalCartel Heartbeat Service is DOWN"
    action: "Check heartbeat service immediately"
```

### Trading System Down Alert
```yaml
- alert: SignalCartel_Trading_System_Down
  query: 'count(logs) where service_name="quantum-forge-production-trading" AND (body contains "TRADE" OR body contains "POSITION") in last 5m'
  condition: '< 1'
  labels:
    severity: critical
    service: signalcartel
  annotations:
    title: "🚨 SignalCartel Trading System Not Active"
    action: "Check production trading system"
```

## 📱 **Setting Up Notifications**

### Email Notifications
1. Go to **Settings** → **Notification Channels**
2. Create email channel:
   - **Name**: signalcartel-critical
   - **Type**: Email
   - **Recipients**: your-email@domain.com

### Slack Notifications  
1. Create Slack webhook in your workspace
2. Add to SigNoz:
   - **Name**: signalcartel-slack
   - **Type**: Slack
   - **Webhook URL**: your-webhook-url

### Routing Rules
```yaml
# Send critical alerts to email
- match:
    severity: critical
    service: signalcartel
  receiver: signalcartel-critical

# Send all alerts to Slack  
- match:
    service: signalcartel
  receiver: signalcartel-slack
```

## 🩺 **System Health Monitoring**

The heartbeat system monitors:

- **📝 Log Health**: Trading system logs updated recently
- **📊 Trading Activity**: Trades executed in last 10 minutes  
- **🔢 Open Positions**: Current number of open positions
- **💻 System Metrics**: Memory usage and performance
- **🔍 Error Patterns**: Critical and warning errors

### Health Status Logic
- **HEALTHY** (1.0): Logs active + (trading activity OR open positions)
- **WARNING** (0.5): Logs active but no recent activity  
- **CRITICAL** (0.0): Logs stale or major system failure

## 📈 **Monitoring Your System**

### View Real-Time Status
```bash
# Check recent heartbeat output
tail -f /tmp/heartbeat.log

# View trading system health
tail -f /tmp/signalcartel-logs/production-trading.log
```

### SigNoz Dashboard Views
1. **Logs View**: Filter by `service_name="signalcartel-heartbeat"`
2. **Search for**: 
   - `HEALTH` - System healthy messages
   - `WARNING` - System warnings  
   - `CRITICAL` - Critical errors
   - `ERROR` - General errors

## 🚨 **Alert Response Guide**

### When Alerts Fire

**🚨 Service Down Alert**:
1. Check if heartbeat service is running: `ps aux | grep heartbeat`
2. Restart: `./admin/start-heartbeat-service.sh &`
3. Check logs: `tail -f /tmp/heartbeat.log`

**🚨 Trading System Down**:
1. Check production trading: `ps aux | grep production-trading`
2. Restart trading system using your normal start command
3. Monitor for position recovery

**⚠️ System Warnings**:
1. Check recent logs for error patterns
2. Monitor system performance
3. Consider restarting if warnings persist

## 🔧 **Troubleshooting**

### Common Issues

**Heartbeat not sending data**:
- Check database connection
- Verify external monitoring server is accessible
- Check log file permissions

**No alerts firing**:
- Verify SigNoz rules are imported correctly
- Check log query syntax in SigNoz
- Test alert rules manually

**Too many alerts**:
- Adjust alert thresholds in the YAML file
- Add alert suppression rules
- Review notification routing

### Testing Alerts

```bash
# Simulate system down (stop trading system temporarily)
# Should trigger trading system down alert after 5 minutes

# Simulate heartbeat down (stop heartbeat service)
# Should trigger service down alert after 2 minutes
```

## 📚 **Files Reference**

- `admin/signalcartel-heartbeat.ts` - Main heartbeat service
- `admin/signoz-alert-rules.yaml` - Alert rule definitions
- `admin/start-heartbeat-service.sh` - Service startup script
- `admin/test-heartbeat.sh` - Test script
- `src/lib/telemetry/production-telemetry.ts` - Telemetry system

---

## ✅ **Next Steps**

1. **Start the heartbeat service** alongside your trading system
2. **Import alert rules** into your SigNoz dashboard  
3. **Configure notification channels** (email/slack)
4. **Test the alerts** by temporarily stopping services
5. **Monitor and tune** alert thresholds as needed

Your SignalCartel system now has enterprise-grade monitoring! 🚀