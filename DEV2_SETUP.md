# DEV2 FAILOVER NODE SETUP - CONTEST CRITICAL
**Last Updated**: September 20, 2025
**Purpose**: 100% uptime for trading contest evaluation to get $100-200k funded account

## 🚨 CRITICAL FOR CONTEST SUCCESS
The trading evaluation requires continuous operation. If dev1 fails during evaluation, we MUST have dev2 ready to take over immediately to avoid failing the contest.

## 📋 DEV2 SETUP CHECKLIST

### 1️⃣ **CLONE REPOSITORY**
```bash
# On dev2 machine
cd ~
git clone https://github.com/yourusername/signalcartel-alien.git depot/current
cd depot/current

# Get latest updates
git pull origin main
```

### 2️⃣ **INSTALL DEPENDENCIES**
```bash
# Install Node.js 22.x
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL 15
sudo apt-get update
sudo apt-get install postgresql-15 postgresql-client-15

# Install project dependencies
npm install

# Install global tools
npm install -g tsx prisma
```

### 3️⃣ **DATABASE SETUP**
```bash
# Create database and user
sudo -u postgres psql << EOF
CREATE USER warehouse_user WITH PASSWORD 'quantum_forge_warehouse_2024';
CREATE DATABASE signalcartel OWNER warehouse_user;
ALTER USER warehouse_user CREATEDB;
EOF

# Initialize Prisma schema
npx prisma generate
npx prisma db push

# Enable replication (for syncing from dev1)
sudo nano /etc/postgresql/15/main/postgresql.conf
# Set: listen_addresses = '*'
# Set: wal_level = replica
# Set: max_wal_senders = 3

sudo systemctl restart postgresql
```

### 4️⃣ **ENVIRONMENT CONFIGURATION**
Create `.env` file:
```bash
DATABASE_URL="postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public"
NODE_ENV=production
TRADING_MODE=LIVE

# Kraken API (SAME AS DEV1 - CRITICAL!)
KRAKEN_API_KEY="your_kraken_api_key"
KRAKEN_API_SECRET="your_kraken_api_secret"

# Node Configuration
NODE_ROLE=failover
PRIMARY_HOST=dev1.local  # Or IP address of dev1
FAILOVER_HOST=localhost

# Features
ENABLE_MARGIN_TRADING=true
ENABLE_FUTURES_TRADING=true
ENABLE_GPU_STRATEGIES=true
```

### 5️⃣ **SYNC FROM PRIMARY (DEV1)**
```bash
# Initial database sync
./admin/sync-from-primary.sh

# Copy logs for continuity
rsync -avz dev1:/tmp/signalcartel-logs/ /tmp/signalcartel-logs/
```

### 6️⃣ **START FAILOVER MONITORING**
```bash
# This monitors dev1 health and takes over if it fails
./failover-start.sh

# Should output:
# 📍 Running as FAILOVER node (dev2)
# 👁️ Monitoring primary node health...
```

## 🔄 FAILOVER SCENARIOS

### **Scenario 1: Dev1 Crashes**
1. Failover sentinel detects 3 consecutive failed health checks
2. Dev2 automatically:
   - Syncs latest database state
   - Starts trading services
   - Takes over as primary
3. You get ntfy notification: "🚨 FAILOVER ACTIVATED"

### **Scenario 2: Dev1 Recovers**
1. Sentinel detects dev1 is back online
2. Waits 1 minute for stability
3. Gracefully stops dev2 trading
4. Syncs state back to dev1
5. Returns to monitoring mode

### **Scenario 3: Manual Failover**
```bash
# Force dev2 to take over
./failover-start.sh primary

# Force back to monitoring
./failover-start.sh failover
```

## 📊 MONITORING & VALIDATION

### **Check Failover Status**
```bash
# View sentinel logs
tail -f /tmp/signalcartel-logs/failover-sentinel.log

# Check if trading is active
ps aux | grep -E "production-trading|profit-predator"

# View dashboard
curl http://localhost:3004  # Should show if dev2 is trading
```

### **Contest Validation Monitor**
```bash
# Continue tracking 24-hour validation on dev2
npx tsx admin/contest-validation-monitor.ts

# Check validation status
tail -f /tmp/signalcartel-logs/contest-validation.log
```

## 🚨 CRITICAL NOTES

1. **SAME KRAKEN API KEYS**: Dev2 MUST use the same Kraken API credentials as dev1
2. **DATABASE SYNC**: Always sync before taking over to avoid position mismatches
3. **NETWORK CONNECTIVITY**: Ensure dev1 and dev2 can reach each other
4. **CONTEST MODE**: During evaluation, failover should be INSTANT (no manual intervention)

## 📞 EMERGENCY PROCEDURES

### **If Both Nodes Fail**
1. Check Kraken directly - positions are real and exist there
2. Restart dev1 first (primary)
3. Run position sync: `npx tsx admin/sync-positions.ts`
4. Resume trading: `./tensor-start.sh`

### **If Database Corrupted**
1. Stop all trading
2. Export positions from Kraken API
3. Restore database from backup
4. Reconcile with Kraken actual positions

## ✅ TESTING CHECKLIST

Before contest evaluation:
- [ ] Test failover from dev1 → dev2
- [ ] Test failback from dev2 → dev1
- [ ] Verify database sync works
- [ ] Confirm positions match after failover
- [ ] Test network partition scenario
- [ ] Verify ntfy notifications work

## 🎯 CONTEST READINESS

**Goal**: Pass evaluation → Get $100-200k funded account

**Requirements**:
- 76%+ win rate ✅ (currently 76.2%)
- Positive P&L ✅
- 100% uptime during evaluation (THIS IS WHY WE NEED DEV2!)

**With dev2 failover ready, we have**:
- Automatic failover in <30 seconds
- Zero data loss with database sync
- Continuous trading during dev1 outages
- Professional infrastructure for funded account trading

---

## 📝 TODO ON DEV2 RIGHT NOW

1. **Install PostgreSQL 15** and create database
2. **Clone this repo** with latest updates
3. **Configure environment** with same Kraken keys
4. **Test database sync** from dev1
5. **Start failover monitoring**
6. **Verify health checks** are working

Once complete, dev2 will automatically take over if dev1 fails during the contest evaluation!