# 📊 SigNoz Configuration Import Guide

## Generated Files

- `alert-rules.json` - Alert rule definitions
- `notification-channels.json` - Email notification channel
- `alertmanager-config.yaml` - Alert routing configuration

## Import Steps

### 1. Import Notification Channel
1. Open SigNoz: http://174.72.187.118:3301
2. Go to **Settings** → **Notification Channels**
3. Click **New Channel**
4. Copy settings from `notification-channels.json`:
   - Name: signalcartel-email-alerts
   - Type: Email  
   - Email: test@example.com

### 2. Import Alert Rules
1. Go to **Alerts** → **Rules** 
2. Click **New Rule** for each alert in `alert-rules.json`:

#### Service Down Alert
- **Alert Name**: SignalCartel_Service_Down
- **Query Type**: Logs
- **Query**: `{service_name="signalcartel-heartbeat"} |~ "HEALTH"`
- **Time Range**: Last 2 minutes
- **Condition**: Count is less than 1
- **Labels**: severity=critical, service=signalcartel
- **Title**: 🚨 SignalCartel Heartbeat Service is DOWN

#### Trading System Down Alert  
- **Alert Name**: SignalCartel_Trading_System_Down
- **Query Type**: Logs
- **Query**: `{service_name="quantum-forge-production-trading"} |~ "TRADE|POSITION"`
- **Time Range**: Last 5 minutes
- **Condition**: Count is less than 1
- **Labels**: severity=critical, service=signalcartel
- **Title**: 🚨 SignalCartel Trading System Not Active

#### System Warning Alert
- **Alert Name**: SignalCartel_System_Warning
- **Query Type**: Logs  
- **Query**: `{service_name="signalcartel-heartbeat"} |~ "WARNING"`
- **Time Range**: Last 10 minutes
- **Condition**: Count is greater than or equal to 3
- **Labels**: severity=warning, service=signalcartel
- **Title**: ⚠️ SignalCartel System Health Warnings

### 3. Set Up Alert Routing
1. Go to **Alert Manager** → **Config**
2. Replace the configuration with contents of `alertmanager-config.yaml`
3. Save and apply

## Test Your Setup
Run: `../test-alerts.sh`

## Email Configuration
Alerts will be sent to: **test@example.com**

Update this email in SigNoz notification channel settings if needed.
