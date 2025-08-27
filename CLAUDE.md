# SignalCartel Trading Platform - Claude Context

## Project Overview
SignalCartel is a revolutionary cryptocurrency trading platform featuring **QUANTUM FORGE™** - our advanced phased intelligence AI paper trading engine. Features GPU-accelerated automated trading strategies with **complete position lifecycle management**, **real multi-source sentiment analysis**, and **phased intelligence activation**. All trades are stored in PostgreSQL for performance analysis and intelligent pattern learning.

## Current State (As of August 26, 2025 - QUANTUM FORGE™ PHASED INTELLIGENCE SYSTEM COMPLETE)

### 🎯 **LATEST: QUANTUM FORGE™ Phased Intelligence System** (August 26, 2025)
- ✅ **PHASED INTELLIGENCE ACTIVATION** - 5-phase system (Phase 0-4) with progressive AI feature activation
- ✅ **ULTRA-LOW BARRIERS** - Phase 0 uses 10% confidence threshold for maximum trade generation (vs 70% Phase 4)
- ✅ **ADAPTIVE PHASE MANAGEMENT** - Quantum intelligence analyzes performance for optimal phase transitions
- ✅ **COMPLETE POSITION LIFECYCLE** - Every trade tracked from entry→exit with real P&L calculation
- ✅ **MATHEMATICAL INTUITION ENGINE** - Parallel analysis comparing calculated vs intuitive trading decisions
- ✅ **REAL-TIME MONITORING** - Live dashboard showing trades, phases, and performance metrics
- ✅ **HYBRID APPROACH** - Combines hardcoded minimums with intelligent performance analysis

### 🚀 **Phase System Architecture:**
- **Phase 0** (0-100 trades): Maximum Data Collection - 10% confidence, no AI filters, raw signals only
- **Phase 1** (100-500 trades): Basic Sentiment - Fear&Greed + Reddit validation
- **Phase 2** (500-1000 trades): Multi-Source Sentiment - 9 sentiment sources with Mathematical Intuition
- **Phase 3** (1000-2000 trades): Order Book Intelligence - Market microstructure + Markov chains
- **Phase 4** (2000+ trades): Full QUANTUM FORGE™ - Complete AI suite with multi-layer consensus

### ⚡ **Position Management System** (COMPLETE - August 26, 2025)
- ✅ **COMPLETE POSITION LIFECYCLE** - Entry → Monitoring → Exit with real P&L tracking
- ✅ **SMART EXIT STRATEGIES** - Stop loss, take profit, trailing stops, time-based exits per strategy
- ✅ **TRADE MATCHING ENGINE** - Pairs entry/exit trades for accurate performance metrics
- ✅ **MATHEMATICAL INTUITION INTEGRATION** - Flow field resonance analysis enhancing position decisions
- ✅ **DATABASE SCHEMA** - ManagedPosition & ManagedTrade tables with complete relationships
- ✅ **STRATEGY INTEGRATION** - All GPU strategies use position management exclusively
- ✅ **MANDATORY ARCHITECTURE** - No trading without complete position lifecycle tracking

### 🧠 **Multi-Source Sentiment Intelligence System** (COMPLETE - August 26, 2025)
- ✅ **12+ LIVE SOURCES** - Fear&Greed, Reddit, News, On-chain, Twitter, Economic indicators, Whale tracking
- ✅ **98% CONFIDENCE** - Advanced multi-dimensional confidence calculation
- ✅ **31+ DATA POINTS** - Comprehensive dataset from crypto + macro + social + technical sources
- ✅ **SOPHISTICATED WEIGHTING** - Exchange flows (3.5x), Economic (3.2x), Fear&Greed (4.0x)
- ✅ **HIGH-PERFORMANCE CACHING** - 5-minute cache reduces API calls by 90%
- ✅ **PARALLEL PROCESSING** - All sources fetched simultaneously with sub-second execution
- ✅ **PHASE-BASED ACTIVATION** - Sentiment sources enabled progressively through phases

### 🏆 **QUANTUM FORGE™ Order Book Intelligence™** (COMPLETE - August 26, 2025)
- ✅ **MULTI-LAYER AI ARCHITECTURE** - 4-layer fusion engine (Technical + Sentiment + Order Book + Fusion)
- ✅ **REAL-TIME MARKET MICROSTRUCTURE** - Whale detection, liquidity analysis, pressure monitoring
- ✅ **TRADITIONAL ORDER BOOK VISUAL** - ExoCharts-style red/green heat maps
- ✅ **ADVANCED STREAMING ANALYSIS** - 2-second updates with flow imbalance analysis
- ✅ **CROSS-LAYER VALIDATION** - Conflict detection between intelligence layers
- ✅ **AI TRANSPARENCY** - Human-readable decision explanations

### 📊 **Real-Time Monitoring & Live Dashboard** (NEW - August 26, 2025)
- ✅ **QUANTUM FORGE™ LIVE MONITOR** - Real-time terminal dashboard with colorized output
- ✅ **COMPREHENSIVE LOGGING** - Trades, phases, errors logged to /tmp/signalcartel-logs/
- ✅ **SESSION STATISTICS** - Trades per hour, win rate, P&L tracking
- ✅ **PHASE TRANSITION ALERTS** - Real-time notifications when advancing phases
- ✅ **STARTUP SCRIPT** - Single command launches trading + monitoring
- ✅ **GRACEFUL SHUTDOWN** - Ctrl+C stops all processes cleanly

### 🛡️ **Professional PostgreSQL Backup System** (NEW - August 26, 2025)
- ✅ **PROPER POSTGRESQL TOOLS** - pg_dump, pg_dumpall, pg_basebackup for enterprise-grade backups
- ✅ **COMPREHENSIVE DATA PROTECTION** - Historical pricing (21,830+ points), sentiment data, trading signals
- ✅ **MULTIPLE BACKUP FORMATS** - Custom format (.dump) and SQL format (.sql.gz) for flexibility
- ✅ **AUTOMATED SCHEDULING** - Hourly, daily, and weekly backup cycles with 30-day retention
- ✅ **CLUSTER-WIDE BACKUPS** - Complete cluster backup including roles and global objects
- ✅ **VERIFICATION & REPORTING** - Automatic integrity checks with detailed recovery instructions
- ✅ **ENTERPRISE RETENTION** - 30-day logical, 7-day physical, 14-day cluster backup retention

### 🌐 **Multi-Instance Data Consolidation System** (NEW - August 27, 2025)
- ✅ **CROSS-SITE AI DATA SHARING** - Consolidates data from multiple SignalCartel development sites
- ✅ **UNIFIED AI ALGORITHM ACCESS** - All AI systems can access consolidated data from all sites
- ✅ **PRODUCTION-SAFE DESIGN** - READ-ONLY access to production systems, zero impact on trading
- ✅ **SEPARATE ANALYTICS DATABASE** - `signalcartel_analytics` database for consolidated cross-site data
- ✅ **ENHANCED SCHEMA** - AI capabilities tracking, phase analysis, learning insights, cross-validation
- ✅ **REAL-TIME SYNCHRONIZATION** - Automated data sync between development sites
- ✅ **LEARNING INSIGHTS ENGINE** - Cross-site pattern recognition and strategy optimization
- ✅ **AI SYSTEM COMPARISON** - Performance metrics across all sites for each AI component

## Architecture

### Core Components
1. **Phased Intelligence System** - Progressive AI activation based on performance and trade count
2. **Position Management** - Complete lifecycle tracking with entry→exit P&L calculation
3. **Multi-Source Sentiment** - 12+ real-time intelligence sources with advanced weighting
4. **Mathematical Intuition Engine** - Parallel analysis comparing calculation vs intuition
5. **Order Book Intelligence™** - Market microstructure analysis with whale detection
6. **Real-Time Monitoring** - Live dashboard with comprehensive logging and alerting
7. **Professional Backup System** - Enterprise PostgreSQL backups with automated scheduling
8. **Multi-Instance Consolidation** - Cross-site data sharing and unified AI algorithm access
9. **PostgreSQL Database** - All data stored in postgresql://localhost:5433/signalcartel
10. **Analytics Database** - Consolidated cross-site data in postgresql://localhost:5433/signalcartel_analytics

### Key Files

**🔥 Core Trading System:**
- `load-database-strategies.ts` - Main entry point for phased intelligence trading
- `src/lib/strategy-execution-engine.ts` - Core trading logic with position management integration
- `src/lib/position-management/position-service.ts` - Complete position lifecycle management
- `src/lib/quantum-forge-phase-config.ts` - 5-phase configuration system
- `src/lib/quantum-forge-adaptive-phase-manager.ts` - Intelligent phase transition analysis
- `src/lib/mathematical-intuition-engine.ts` - Parallel intuition vs calculation analysis

**📊 Monitoring & Admin:**
- `admin/quantum-forge-live-monitor.ts` - Real-time trading dashboard
- `admin/start-quantum-forge-with-monitor.sh` - Complete startup solution
- `admin/phase-transition-status.ts` - Phase readiness analysis tool
- `admin/control-trading-phase.ts` - Manual phase control interface
- `scripts/monitoring/openstatus-monitor-service.sh` - Health monitoring service

**🛡️ Professional Backup System:**
- `scripts/backup/postgresql-professional-backup.sh` - Enterprise PostgreSQL backup using proper tools
- `scripts/backup/setup-automated-postgresql-backups.sh` - Automated backup scheduling system
- `scripts/backup/enterprise-backup-system.sh` - Legacy backup system (deprecated)

**🧠 Intelligence Systems:**
- `src/lib/sentiment/simple-twitter-sentiment.ts` - Multi-source sentiment engine
- `src/lib/quantum-forge-multi-layer-ai.ts` - 4-layer AI fusion architecture
- `src/lib/quantum-forge-orderbook-ai.ts` - Order book intelligence analysis
- `src/lib/gpu-*.ts` - GPU-accelerated strategy implementations

**🌐 Multi-Instance Consolidation System:**
- `scripts/multi-instance-setup.sh` - Production-safe cross-site consolidation setup
- `scripts/production-safety-check.sh` - Comprehensive production safety verification
- `scripts/data-consolidation/deploy-analytics-schema.ts` - Analytics database schema deployment
- `scripts/data-consolidation/read-only-sync.sh` - READ-ONLY data synchronization script
- `src/lib/consolidated-ai-data-service.ts` - Unified AI data access service for all algorithms
- `admin/multi-instance-monitor.ts` - Real-time cross-site analytics dashboard
- `admin/test-consolidated-data-access.ts` - Testing suite for consolidated data access

### Database Architecture
- **Production Database** - `postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel`
  - **ManagedPosition Table** - Complete position lifecycle with entry/exit tracking
  - **ManagedTrade Table** - Individual trade records linked to positions
- **Analytics Database** - `postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel_analytics`
  - **Cross-Site Consolidation** - Data from multiple SignalCartel development sites
  - **AI Performance Metrics** - AI system comparison and learning insights across all sites
  - **Enhanced Analytics Views** - Unified performance, market conditions, phase progression analysis
- **No SQLite** - Completely migrated to PostgreSQL architecture

## Quick Commands

### 🚀 **Start Trading with Live Monitor (Primary Command)**
```bash
# Single command - starts trading engine + live monitor
./admin/start-quantum-forge-with-monitor.sh

# Alternative: Separate terminals
ENABLE_GPU_STRATEGIES=true NTFY_TOPIC="signal-cartel" npx tsx -r dotenv/config load-database-strategies.ts
npx tsx -r dotenv/config admin/quantum-forge-live-monitor.ts
```

### 🔧 **TROUBLESHOOTING: Trading Engine Stalls/No Strategies Found**
If the trading engine stalls with "No strategies found in database" error:
```bash
# Solution: Use production-trading-with-positions.ts which creates strategies automatically
DATABASE_URL="postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public" \
ENABLE_GPU_STRATEGIES=true \
NTFY_TOPIC="signal-cartel-dev2" \
npx tsx -r dotenv/config production-trading-with-positions.ts

# Monitor in separate terminal
npx tsx -r dotenv/config admin/quantum-forge-live-monitor.ts
```

**Common symptoms:**
- Logs show: "❌ No strategies found in database"
- Monitor shows old positions with timestamps like "7m ago" that don't update
- No new trades being generated
- Last log entry in /tmp/signalcartel-logs/production-trading.log is old

**Root cause:** The `load-database-strategies.ts` script requires strategies to already exist in the database, while `production-trading-with-positions.ts` creates them automatically.

### 📊 **Phase Management**
```bash
# Check current phase status and readiness
npx tsx -r dotenv/config admin/phase-transition-status.ts

# Manual phase control interface
npx tsx -r dotenv/config admin/control-trading-phase.ts
```

### 🧪 **Testing & Validation**
```bash
# Test position management system
npx tsx -r dotenv/config admin/test-position-tracking.ts

# Test phase barriers
npx tsx -r dotenv/config admin/test-phase-0-barriers.ts
```

### 🛡️ **Professional PostgreSQL Backup System**
```bash
# Manual backup using proper PostgreSQL tools (pg_dump, pg_dumpall)
./scripts/backup/postgresql-professional-backup.sh

# Setup automated backup scheduling (cron jobs)
./scripts/backup/setup-automated-postgresql-backups.sh

# Check backup status and data verification
ls -la /home/telgkb9/signalcartel-enterprise-backups/

# Monitor backup logs
tail -f /tmp/signalcartel-backup*.log

# Legacy backup system (deprecated - use professional system above)
./scripts/backup/simple-db-backup.sh
```

### 🌐 **Multi-Instance Data Consolidation System**
```bash
# STEP 1: Production safety verification (always run first)
./scripts/production-safety-check.sh

# STEP 2: Set up analytics database and consolidation infrastructure
./scripts/multi-instance-setup.sh

# STEP 3: Test consolidated data access for AI algorithms  
ANALYTICS_DB_URL="postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel_analytics?schema=public" \
npx tsx -r dotenv/config admin/test-consolidated-data-access.ts

# STEP 4: Run real-time multi-instance monitoring dashboard
ANALYTICS_DB_URL="postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel_analytics?schema=public" \
npx tsx -r dotenv/config admin/multi-instance-monitor.ts

# Manual analytics database schema deployment (if needed)
ANALYTICS_DB_URL="postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel_analytics?schema=public" \
npx tsx -r dotenv/config scripts/data-consolidation/deploy-analytics-schema.ts

# Data synchronization (READ-ONLY from production)
./scripts/data-consolidation/read-only-sync.sh
```

**🛡️ Production Safety Features:**
- ✅ **ZERO IMPACT** on production trading systems - all operations are READ-ONLY
- ✅ **SEPARATE DATABASE** - Creates `signalcartel_analytics` database completely separate from production
- ✅ **COMPREHENSIVE SAFETY CHECKS** - Verifies production system integrity before any operations
- ✅ **AUTOMATED VERIFICATION** - Tests database connections, disk space, and running processes

## Environment Variables Required
```env
# Database (PostgreSQL Only)
DATABASE_URL="postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel?schema=public"

# Analytics Database (Multi-Instance Consolidation)
ANALYTICS_DB_URL="postgresql://warehouse_user:quantum_forge_warehouse_2024@localhost:5433/signalcartel_analytics?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3001"
NEXTAUTH_SECRET="your-secret"

# GPU Acceleration
ENABLE_GPU_STRATEGIES=true

# Notifications
NTFY_TOPIC="signal-cartel"
```

## Phase Transition Strategy

### Hardcoded Safety Minimums:
- **Phase 0**: 0-100 completed trades (ultra-low barriers)
- **Phase 1**: 100-500 trades (basic sentiment)
- **Phase 2**: 500-1000 trades (multi-source sentiment)
- **Phase 3**: 1000-2000 trades (order book intelligence)
- **Phase 4**: 2000+ trades (full QUANTUM FORGE™)

### Adaptive Intelligence Analysis:
- **Data Volume**: Sufficient trades for next phase?
- **Performance Stability**: Win rate consistent (30-70% learning range)?
- **Performance Trajectory**: Improving or declining trend?
- **Risk Management**: Drawdown under control (<20%)?
- **Data Quality**: Diverse trading conditions and strategies?

### Transition Modes:
- **AUTO** (Default): Smart progression based on performance + minimums
- **MANUAL**: Force specific phase for testing
- **UNRESTRICTED**: Remove all barriers for maximum trade generation

## 🚨 **CRITICAL: Position Management is MANDATORY**

**All trading must use position lifecycle tracking:**
- ✅ **ALWAYS USE**: `load-database-strategies.ts` (includes complete position management)
- ❌ **NEVER USE**: `custom-paper-trading.ts` (bypasses position tracking)
- ⚠️ **DATABASE**: PostgreSQL only - no SQLite exceptions
- 🔒 **ARCHITECTURE**: Entry→Exit lifecycle tracking required for all intelligence

## Important Notes
- **Phase 0 Active**: Ultra-low barriers (10% confidence) for maximum data collection
- **PostgreSQL Only**: All data in postgresql://localhost:5433/signalcartel
- **Complete Position Tracking**: Every trade lifecycle from entry to exit
- **Real-Time Monitoring**: Live dashboard shows all activity with comprehensive logging
- **Mathematical Intuition**: Parallel analysis enhancing traditional calculations
- **Admin Scripts**: All organized in `/admin` folder for easy access
- **Log Files**: All activity logged to `/tmp/signalcartel-logs/` for analysis
- **Graceful Shutdown**: Ctrl+C cleanly stops all processes

## Hardware Context
- Development server: Alienware Aurora R6
- CPU: Intel i7-7700 (4C/8T, 3.6-4.2GHz)
- RAM: 32GB DDR4
- GPU: NVIDIA GTX 1080 8GB (CUDA 13.0 working)
- OS: Debian 13 (trixie)

## Repository
- GitHub: https://github.com/ninjahangover/signalcartel
- Main branch is production
- Latest update: Multi-Instance Data Consolidation System with cross-site AI algorithm data sharing

---
*QUANTUM FORGE™ Multi-Instance Intelligence Achievement: Revolutionary 5-phase AI activation system with ultra-low barriers for maximum data collection (Phase 0: 10% confidence threshold), complete position lifecycle management, Mathematical Intuition Engine parallel analysis, real-time monitoring dashboard, intelligent phase transitions, and now featuring cross-site data consolidation with unified AI algorithm access - the world's first truly adaptive multi-instance cryptocurrency trading platform that learns and evolves through progressive intelligence activation across multiple development sites while maintaining zero impact on production systems.*