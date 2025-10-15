--
-- PostgreSQL database dump
--

\restrict 5Ua2f4VyiFcaoAk2WpHi7xgnzBkUhCXYxcnl19fadZoltfqCWh4fh75yXy4fTCu

-- Dumped from database version 15.14
-- Dumped by pg_dump version 15.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: OTCAccountSnapshot; Type: TABLE; Schema: public; Owner: warehouse_user
--

CREATE TABLE public."OTCAccountSnapshot" (
    id text NOT NULL,
    "accountId" text NOT NULL,
    "totalBalance" double precision NOT NULL,
    "availableBalance" double precision NOT NULL,
    "openPositions" integer NOT NULL,
    "totalPnL" double precision NOT NULL,
    "todayPnL" double precision NOT NULL,
    "dayTradesUsed" integer NOT NULL,
    "dayTradesRemaining" integer NOT NULL,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."OTCAccountSnapshot" OWNER TO warehouse_user;

--
-- Name: OTCPosition; Type: TABLE; Schema: public; Owner: warehouse_user
--

CREATE TABLE public."OTCPosition" (
    id text NOT NULL,
    symbol text NOT NULL,
    side text NOT NULL,
    "entryPrice" double precision NOT NULL,
    "currentPrice" double precision NOT NULL,
    quantity integer NOT NULL,
    "entryValue" double precision NOT NULL,
    "currentValue" double precision NOT NULL,
    "realizedPnL" double precision DEFAULT 0 NOT NULL,
    "unrealizedPnL" double precision DEFAULT 0 NOT NULL,
    status text NOT NULL,
    "ibkrOrderId" text,
    "ibkrPositionId" text,
    "entryConfidence" double precision NOT NULL,
    "entryReason" text NOT NULL,
    "aiSignalStrength" double precision NOT NULL,
    "tensorDecision" jsonb,
    "stopLossPrice" double precision NOT NULL,
    "takeProfitPrice" double precision,
    "trailingStopPct" double precision,
    "isDayTrade" boolean DEFAULT false NOT NULL,
    "entryDate" timestamp(3) without time zone NOT NULL,
    "exitDate" timestamp(3) without time zone,
    "holdingPeriodDays" integer,
    "returnPct" double precision DEFAULT 0 NOT NULL,
    "rMultiple" double precision,
    "maxDrawdown" double precision DEFAULT 0 NOT NULL,
    "maxGain" double precision DEFAULT 0 NOT NULL,
    "entryVolume" double precision,
    "avgVolume" double precision,
    "volumeRatio" double precision,
    "newsEvent" text,
    "marketRegime" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."OTCPosition" OWNER TO warehouse_user;

--
-- Name: OTCPriceData; Type: TABLE; Schema: public; Owner: warehouse_user
--

CREATE TABLE public."OTCPriceData" (
    id text NOT NULL,
    ticker text NOT NULL,
    "timestamp" timestamp(3) without time zone NOT NULL,
    open double precision NOT NULL,
    high double precision NOT NULL,
    low double precision NOT NULL,
    close double precision NOT NULL,
    volume bigint NOT NULL,
    "dataSource" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."OTCPriceData" OWNER TO warehouse_user;

--
-- Name: OTCPriorityWatchlist; Type: TABLE; Schema: public; Owner: warehouse_user
--

CREATE TABLE public."OTCPriorityWatchlist" (
    id text NOT NULL,
    ticker text NOT NULL,
    "tradeDate" timestamp(3) without time zone NOT NULL,
    "sentimentScore" double precision NOT NULL,
    "convictionLevel" text NOT NULL,
    sources jsonb,
    "newsLinks" jsonb,
    notes text,
    "preMarketVolume" double precision,
    "preMarketPriceGap" double precision,
    "orderBookMomentum" text,
    "entryThreshold" double precision NOT NULL,
    "wasTraded" boolean DEFAULT false NOT NULL,
    "tradeOutcome" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."OTCPriorityWatchlist" OWNER TO warehouse_user;

--
-- Name: OTCSentiment; Type: TABLE; Schema: public; Owner: warehouse_user
--

CREATE TABLE public."OTCSentiment" (
    id text NOT NULL,
    ticker text NOT NULL,
    source text NOT NULL,
    content text,
    url text,
    author text,
    score double precision,
    mentions integer,
    "timestamp" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."OTCSentiment" OWNER TO warehouse_user;

--
-- Name: OTCTradeOutcome; Type: TABLE; Schema: public; Owner: warehouse_user
--

CREATE TABLE public."OTCTradeOutcome" (
    id text NOT NULL,
    "positionId" text NOT NULL,
    symbol text NOT NULL,
    side text NOT NULL,
    "entryPrice" double precision NOT NULL,
    "entryConfidence" double precision NOT NULL,
    "aiSignalStrength" double precision NOT NULL,
    "entryReason" text NOT NULL,
    "exitPrice" double precision NOT NULL,
    "exitReason" text NOT NULL,
    "holdingPeriodMins" integer NOT NULL,
    "returnPct" double precision NOT NULL,
    "profitLoss" double precision NOT NULL,
    "isWin" boolean NOT NULL,
    "rMultiple" double precision NOT NULL,
    "expectedReturn" double precision NOT NULL,
    "actualReturn" double precision NOT NULL,
    "predictionError" double precision NOT NULL,
    "confidenceLevel" double precision NOT NULL,
    volatility double precision NOT NULL,
    "volumeRatio" double precision NOT NULL,
    "wasHockeyStick" boolean DEFAULT false NOT NULL,
    "newsEvent" text,
    "decisionFactors" jsonb NOT NULL,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "entryTime" timestamp(3) without time zone NOT NULL,
    "exitTime" timestamp(3) without time zone,
    "ohlcData" jsonb,
    "sentimentScore" double precision,
    "tradingWindow" text,
    "wasOnWatchlist" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."OTCTradeOutcome" OWNER TO warehouse_user;

--
-- Name: OTCWatchlist; Type: TABLE; Schema: public; Owner: warehouse_user
--

CREATE TABLE public."OTCWatchlist" (
    id text NOT NULL,
    symbol text NOT NULL,
    "totalTrades" integer DEFAULT 0 NOT NULL,
    "winningTrades" integer DEFAULT 0 NOT NULL,
    "losingTrades" integer DEFAULT 0 NOT NULL,
    "winRate" double precision DEFAULT 0 NOT NULL,
    "avgReturn" double precision DEFAULT 0 NOT NULL,
    "totalPnL" double precision DEFAULT 0 NOT NULL,
    "avgVolatility" double precision,
    "avgVolume" double precision,
    "priceRange" text,
    sector text,
    "isHighProbability" boolean DEFAULT false NOT NULL,
    "isAvoided" boolean DEFAULT false NOT NULL,
    "avoidReason" text,
    "lastTradeDate" timestamp(3) without time zone,
    "lastAnalysisDate" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."OTCWatchlist" OWNER TO warehouse_user;

--
-- Name: PDTTracker; Type: TABLE; Schema: public; Owner: warehouse_user
--

CREATE TABLE public."PDTTracker" (
    id text NOT NULL,
    "accountId" text NOT NULL,
    "tradeDate" timestamp(3) without time zone NOT NULL,
    symbol text NOT NULL,
    "isDayTrade" boolean NOT NULL,
    "dayTradeCount" integer NOT NULL,
    "isViolation" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."PDTTracker" OWNER TO warehouse_user;

--
-- Name: QualifiedOpportunity; Type: TABLE; Schema: public; Owner: warehouse_user
--

CREATE TABLE public."QualifiedOpportunity" (
    id text NOT NULL,
    symbol text NOT NULL,
    rank integer NOT NULL,
    "overallScore" double precision NOT NULL,
    "technicalScore" double precision NOT NULL,
    "sentimentScore" double precision NOT NULL,
    "catalystScore" double precision NOT NULL,
    "bestPattern" text NOT NULL,
    "patternConfidence" double precision NOT NULL,
    "entryPrice" double precision NOT NULL,
    "stopLoss" double precision NOT NULL,
    target1 double precision NOT NULL,
    target2 double precision NOT NULL,
    target3 double precision NOT NULL,
    rumor text NOT NULL,
    reasoning text NOT NULL,
    "currentPrice" double precision NOT NULL,
    "volumeRatio" double precision NOT NULL,
    "redditMentions" integer DEFAULT 0 NOT NULL,
    status text NOT NULL,
    "qualifiedAt" timestamp(3) without time zone NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."QualifiedOpportunity" OWNER TO warehouse_user;

--
-- Name: OTCAccountSnapshot OTCAccountSnapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: warehouse_user
--

ALTER TABLE ONLY public."OTCAccountSnapshot"
    ADD CONSTRAINT "OTCAccountSnapshot_pkey" PRIMARY KEY (id);


--
-- Name: OTCPosition OTCPosition_pkey; Type: CONSTRAINT; Schema: public; Owner: warehouse_user
--

ALTER TABLE ONLY public."OTCPosition"
    ADD CONSTRAINT "OTCPosition_pkey" PRIMARY KEY (id);


--
-- Name: OTCPriceData OTCPriceData_pkey; Type: CONSTRAINT; Schema: public; Owner: warehouse_user
--

ALTER TABLE ONLY public."OTCPriceData"
    ADD CONSTRAINT "OTCPriceData_pkey" PRIMARY KEY (id);


--
-- Name: OTCPriorityWatchlist OTCPriorityWatchlist_pkey; Type: CONSTRAINT; Schema: public; Owner: warehouse_user
--

ALTER TABLE ONLY public."OTCPriorityWatchlist"
    ADD CONSTRAINT "OTCPriorityWatchlist_pkey" PRIMARY KEY (id);


--
-- Name: OTCSentiment OTCSentiment_pkey; Type: CONSTRAINT; Schema: public; Owner: warehouse_user
--

ALTER TABLE ONLY public."OTCSentiment"
    ADD CONSTRAINT "OTCSentiment_pkey" PRIMARY KEY (id);


--
-- Name: OTCTradeOutcome OTCTradeOutcome_pkey; Type: CONSTRAINT; Schema: public; Owner: warehouse_user
--

ALTER TABLE ONLY public."OTCTradeOutcome"
    ADD CONSTRAINT "OTCTradeOutcome_pkey" PRIMARY KEY (id);


--
-- Name: OTCWatchlist OTCWatchlist_pkey; Type: CONSTRAINT; Schema: public; Owner: warehouse_user
--

ALTER TABLE ONLY public."OTCWatchlist"
    ADD CONSTRAINT "OTCWatchlist_pkey" PRIMARY KEY (id);


--
-- Name: PDTTracker PDTTracker_pkey; Type: CONSTRAINT; Schema: public; Owner: warehouse_user
--

ALTER TABLE ONLY public."PDTTracker"
    ADD CONSTRAINT "PDTTracker_pkey" PRIMARY KEY (id);


--
-- Name: QualifiedOpportunity QualifiedOpportunity_pkey; Type: CONSTRAINT; Schema: public; Owner: warehouse_user
--

ALTER TABLE ONLY public."QualifiedOpportunity"
    ADD CONSTRAINT "QualifiedOpportunity_pkey" PRIMARY KEY (id);


--
-- Name: OTCAccountSnapshot_accountId_timestamp_idx; Type: INDEX; Schema: public; Owner: warehouse_user
--

CREATE INDEX "OTCAccountSnapshot_accountId_timestamp_idx" ON public."OTCAccountSnapshot" USING btree ("accountId", "timestamp");


--
-- Name: OTCPosition_entryDate_idx; Type: INDEX; Schema: public; Owner: warehouse_user
--

CREATE INDEX "OTCPosition_entryDate_idx" ON public."OTCPosition" USING btree ("entryDate");


--
-- Name: OTCPosition_ibkrOrderId_key; Type: INDEX; Schema: public; Owner: warehouse_user
--

CREATE UNIQUE INDEX "OTCPosition_ibkrOrderId_key" ON public."OTCPosition" USING btree ("ibkrOrderId");


--
-- Name: OTCPosition_isDayTrade_idx; Type: INDEX; Schema: public; Owner: warehouse_user
--

CREATE INDEX "OTCPosition_isDayTrade_idx" ON public."OTCPosition" USING btree ("isDayTrade");


--
-- Name: OTCPosition_symbol_status_idx; Type: INDEX; Schema: public; Owner: warehouse_user
--

CREATE INDEX "OTCPosition_symbol_status_idx" ON public."OTCPosition" USING btree (symbol, status);


--
-- Name: OTCPriceData_dataSource_idx; Type: INDEX; Schema: public; Owner: warehouse_user
--

CREATE INDEX "OTCPriceData_dataSource_idx" ON public."OTCPriceData" USING btree ("dataSource");


--
-- Name: OTCPriceData_ticker_timestamp_idx; Type: INDEX; Schema: public; Owner: warehouse_user
--

CREATE INDEX "OTCPriceData_ticker_timestamp_idx" ON public."OTCPriceData" USING btree (ticker, "timestamp");


--
-- Name: OTCPriorityWatchlist_convictionLevel_idx; Type: INDEX; Schema: public; Owner: warehouse_user
--

CREATE INDEX "OTCPriorityWatchlist_convictionLevel_idx" ON public."OTCPriorityWatchlist" USING btree ("convictionLevel");


--
-- Name: OTCPriorityWatchlist_ticker_tradeDate_idx; Type: INDEX; Schema: public; Owner: warehouse_user
--

CREATE INDEX "OTCPriorityWatchlist_ticker_tradeDate_idx" ON public."OTCPriorityWatchlist" USING btree (ticker, "tradeDate");


--
-- Name: OTCPriorityWatchlist_tradeDate_idx; Type: INDEX; Schema: public; Owner: warehouse_user
--

CREATE INDEX "OTCPriorityWatchlist_tradeDate_idx" ON public."OTCPriorityWatchlist" USING btree ("tradeDate");


--
-- Name: OTCSentiment_source_idx; Type: INDEX; Schema: public; Owner: warehouse_user
--

CREATE INDEX "OTCSentiment_source_idx" ON public."OTCSentiment" USING btree (source);


--
-- Name: OTCSentiment_ticker_timestamp_idx; Type: INDEX; Schema: public; Owner: warehouse_user
--

CREATE INDEX "OTCSentiment_ticker_timestamp_idx" ON public."OTCSentiment" USING btree (ticker, "timestamp");


--
-- Name: OTCSentiment_timestamp_idx; Type: INDEX; Schema: public; Owner: warehouse_user
--

CREATE INDEX "OTCSentiment_timestamp_idx" ON public."OTCSentiment" USING btree ("timestamp");


--
-- Name: OTCTradeOutcome_isWin_idx; Type: INDEX; Schema: public; Owner: warehouse_user
--

CREATE INDEX "OTCTradeOutcome_isWin_idx" ON public."OTCTradeOutcome" USING btree ("isWin");


--
-- Name: OTCTradeOutcome_symbol_idx; Type: INDEX; Schema: public; Owner: warehouse_user
--

CREATE INDEX "OTCTradeOutcome_symbol_idx" ON public."OTCTradeOutcome" USING btree (symbol);


--
-- Name: OTCTradeOutcome_timestamp_idx; Type: INDEX; Schema: public; Owner: warehouse_user
--

CREATE INDEX "OTCTradeOutcome_timestamp_idx" ON public."OTCTradeOutcome" USING btree ("timestamp");


--
-- Name: OTCTradeOutcome_tradingWindow_idx; Type: INDEX; Schema: public; Owner: warehouse_user
--

CREATE INDEX "OTCTradeOutcome_tradingWindow_idx" ON public."OTCTradeOutcome" USING btree ("tradingWindow");


--
-- Name: OTCTradeOutcome_wasHockeyStick_idx; Type: INDEX; Schema: public; Owner: warehouse_user
--

CREATE INDEX "OTCTradeOutcome_wasHockeyStick_idx" ON public."OTCTradeOutcome" USING btree ("wasHockeyStick");


--
-- Name: OTCTradeOutcome_wasOnWatchlist_idx; Type: INDEX; Schema: public; Owner: warehouse_user
--

CREATE INDEX "OTCTradeOutcome_wasOnWatchlist_idx" ON public."OTCTradeOutcome" USING btree ("wasOnWatchlist");


--
-- Name: OTCWatchlist_isAvoided_idx; Type: INDEX; Schema: public; Owner: warehouse_user
--

CREATE INDEX "OTCWatchlist_isAvoided_idx" ON public."OTCWatchlist" USING btree ("isAvoided");


--
-- Name: OTCWatchlist_isHighProbability_idx; Type: INDEX; Schema: public; Owner: warehouse_user
--

CREATE INDEX "OTCWatchlist_isHighProbability_idx" ON public."OTCWatchlist" USING btree ("isHighProbability");


--
-- Name: OTCWatchlist_symbol_key; Type: INDEX; Schema: public; Owner: warehouse_user
--

CREATE UNIQUE INDEX "OTCWatchlist_symbol_key" ON public."OTCWatchlist" USING btree (symbol);


--
-- Name: OTCWatchlist_winRate_idx; Type: INDEX; Schema: public; Owner: warehouse_user
--

CREATE INDEX "OTCWatchlist_winRate_idx" ON public."OTCWatchlist" USING btree ("winRate");


--
-- Name: PDTTracker_accountId_tradeDate_idx; Type: INDEX; Schema: public; Owner: warehouse_user
--

CREATE INDEX "PDTTracker_accountId_tradeDate_idx" ON public."PDTTracker" USING btree ("accountId", "tradeDate");


--
-- Name: PDTTracker_isDayTrade_idx; Type: INDEX; Schema: public; Owner: warehouse_user
--

CREATE INDEX "PDTTracker_isDayTrade_idx" ON public."PDTTracker" USING btree ("isDayTrade");


--
-- Name: QualifiedOpportunity_overallScore_idx; Type: INDEX; Schema: public; Owner: warehouse_user
--

CREATE INDEX "QualifiedOpportunity_overallScore_idx" ON public."QualifiedOpportunity" USING btree ("overallScore");


--
-- Name: QualifiedOpportunity_rank_idx; Type: INDEX; Schema: public; Owner: warehouse_user
--

CREATE INDEX "QualifiedOpportunity_rank_idx" ON public."QualifiedOpportunity" USING btree (rank);


--
-- Name: QualifiedOpportunity_status_idx; Type: INDEX; Schema: public; Owner: warehouse_user
--

CREATE INDEX "QualifiedOpportunity_status_idx" ON public."QualifiedOpportunity" USING btree (status);


--
-- Name: QualifiedOpportunity_symbol_key; Type: INDEX; Schema: public; Owner: warehouse_user
--

CREATE UNIQUE INDEX "QualifiedOpportunity_symbol_key" ON public."QualifiedOpportunity" USING btree (symbol);


--
-- PostgreSQL database dump complete
--

\unrestrict 5Ua2f4VyiFcaoAk2WpHi7xgnzBkUhCXYxcnl19fadZoltfqCWh4fh75yXy4fTCu

