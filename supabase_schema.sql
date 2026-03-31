-- ─────────────────────────────────────────────────────────────
--  Automo.ai — Supabase Database Schema
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ─────────────────────────────────────────────────────────────

-- 1. Users table
create table if not exists users (
  id               uuid default gen_random_uuid() primary key,
  business_name    text not null,
  category         text not null,
  whatsapp_number  text unique,
  created_at       timestamptz default now()
);

-- 2. Brand Kits table
create table if not exists brand_kits (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid references users(id) on delete cascade,
  logo_url         text,
  primary_color    text default '#FF6600',
  secondary_color  text default '#1c1c1c',
  font_style       text default 'modern',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- 3. Row Level Security (RLS) — allow all for now (tighten post-launch)
alter table users      enable row level security;
alter table brand_kits enable row level security;

create policy "Allow all on users"      on users      for all using (true) with check (true);
create policy "Allow all on brand_kits" on brand_kits for all using (true) with check (true);

-- 4. Storage bucket for logos
--    Run separately in: Supabase Dashboard → Storage → New Bucket
--    Name: brand-assets  |  Public: true
insert into storage.buckets (id, name, public)
values ('brand-assets', 'brand-assets', true)
on conflict (id) do nothing;

create policy "Allow public uploads to brand-assets"
  on storage.objects for insert
  with check (bucket_id = 'brand-assets');

create policy "Allow public reads from brand-assets"
  on storage.objects for select
  using (bucket_id = 'brand-assets');

-- ─────────────────────────────────────────────────────────────
--  Phase 1 additions — Credits, Posts, Credit Usage
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  total_credits INT DEFAULT 0,
  used_credits INT DEFAULT 0,
  plan VARCHAR(20) DEFAULT 'starter',
  reset_date TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID REFERENCES brand_kits(id) ON DELETE CASCADE,
  platform VARCHAR(30),
  caption TEXT,
  image_url TEXT,
  canva_design_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'draft',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  posted_at TIMESTAMP WITH TIME ZONE,
  reach INT DEFAULT 0,
  engagement INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50),
  credits_used INT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_brand_id ON posts(brand_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_credit_usage_user_id ON credit_usage(user_id);

-- ─────────────────────────────────────────────────────────────
--  Phase 2 additions — Brand caching + content memory
--  Run this block if you already ran Phase 1 above
-- ─────────────────────────────────────────────────────────────

-- Add brand intelligence columns to brand_kits (run once)
ALTER TABLE brand_kits
  ADD COLUMN IF NOT EXISTS website_url       TEXT,
  ADD COLUMN IF NOT EXISTS brand_name        TEXT,
  ADD COLUMN IF NOT EXISTS colors_json       JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS category          TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS city              TEXT,
  ADD COLUMN IF NOT EXISTS phone             TEXT,
  ADD COLUMN IF NOT EXISTS last_detected_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS total_posts_generated INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status            TEXT DEFAULT 'active';

-- Unique index on website_url for upsert/cache lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_brand_kits_website_url ON brand_kits(website_url)
  WHERE website_url IS NOT NULL;

-- Add content_category + quality_score to posts
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS content_category TEXT,
  ADD COLUMN IF NOT EXISTS quality_score    INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hashtags         TEXT[];

-- Churned user tracking (run nightly via cron or Supabase scheduled function)
-- UPDATE brand_kits SET status = 'inactive' WHERE last_detected_at < NOW() - INTERVAL '7 days' AND status = 'active';
-- UPDATE brand_kits SET status = 'churned'  WHERE last_detected_at < NOW() - INTERVAL '30 days' AND status != 'churned';

CREATE INDEX IF NOT EXISTS idx_brand_kits_status ON brand_kits(status);
CREATE INDEX IF NOT EXISTS idx_brand_kits_category ON brand_kits(category);

-- ─────────────────────────────────────────────────────────────
--  Phase 3 additions — 3-layer brand extractor fields
--  Run this block if you already ran Phase 2 above
-- ─────────────────────────────────────────────────────────────

ALTER TABLE brand_kits
  ADD COLUMN IF NOT EXISTS brand_tone        TEXT,
  ADD COLUMN IF NOT EXISTS target_audience   TEXT,
  ADD COLUMN IF NOT EXISTS logo_type         TEXT,
  ADD COLUMN IF NOT EXISTS tagline           TEXT,
  ADD COLUMN IF NOT EXISTS extraction_layers JSONB DEFAULT '{}';
  -- extraction_layers stores raw per-layer outputs for debugging

-- ─────────────────────────────────────────────────────────────
--  Phase 4 additions — Ideogram integration
--  Logo extraction fallback + Ideogram flyer generation metadata
-- ─────────────────────────────────────────────────────────────

ALTER TABLE brand_kits
  ADD COLUMN IF NOT EXISTS logo_method           VARCHAR(30),
    -- 'og_image' | 'twitter_image' | 'favicon' | 'svg' | 'vision_fallback' | 'vision_to_ideogram'
  ADD COLUMN IF NOT EXISTS logo_vision_description TEXT,
    -- Claude Vision description when standard extraction fails
  ADD COLUMN IF NOT EXISTS logo_vision_confidence FLOAT DEFAULT 0.0,
    -- Confidence score from vision analysis (0.0-1.0)
  ADD COLUMN IF NOT EXISTS ideogram_flyer_url   TEXT,
    -- Final generated flyer image URL (CDN or local)
  ADD COLUMN IF NOT EXISTS ideogram_design_id   VARCHAR(100),
    -- Ideogram design ID for reference
  ADD COLUMN IF NOT EXISTS ideogram_generation_time INT,
    -- Time taken to generate in milliseconds
  ADD COLUMN IF NOT EXISTS ideogram_prompt       TEXT,
    -- Original prompt sent to Ideogram (for debugging)
  ADD COLUMN IF NOT EXISTS canvas_polish_applied BOOLEAN DEFAULT FALSE,
    -- Whether node-canvas polish layer was applied
  ADD COLUMN IF NOT EXISTS last_flyer_generated_at TIMESTAMP WITH TIME ZONE;

-- Index for queries
CREATE INDEX IF NOT EXISTS idx_brand_kits_logo_method ON brand_kits(logo_method);
CREATE INDEX IF NOT EXISTS idx_brand_kits_ideogram_design_id ON brand_kits(ideogram_design_id);
CREATE INDEX IF NOT EXISTS idx_brand_kits_last_flyer_generated_at ON brand_kits(last_flyer_generated_at DESC);

-- Update posts table for Ideogram tracking
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS ideogram_design_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS canvas_polish_applied BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ideogram_generation_time INT;

-- Storage bucket for Ideogram flyers
INSERT INTO storage.buckets (id, name, public)
VALUES ('automo-flyers', 'automo-flyers', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY IF NOT EXISTS "Allow public reads from automo-flyers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'automo-flyers');

CREATE POLICY IF NOT EXISTS "Allow public uploads to automo-flyers"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'automo-flyers');

-- ─────────────────────────────────────────────────────────────
--  Phase 5 — WhatsApp-first architecture (v3.0)
--  Add missing columns to users and brand_kits.
--  Create whatsapp_sessions and payments tables.
-- ─────────────────────────────────────────────────────────────

-- Extend users table for WhatsApp-first flow
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone              VARCHAR(15) UNIQUE,
  ADD COLUMN IF NOT EXISTS business_type      VARCHAR(50),
  ADD COLUMN IF NOT EXISTS plan               VARCHAR(20) DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS captions_used      INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS flyers_used        INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS posts_used         INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS usage_reset_at     TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS buffer_access_token TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;

-- Extend brand_kits for Canva MCP logo flow
ALTER TABLE brand_kits
  ADD COLUMN IF NOT EXISTS business_name       VARCHAR(255),
  ADD COLUMN IF NOT EXISTS canva_logo_asset_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS address             TEXT,
  ADD COLUMN IF NOT EXISTS detected_via        VARCHAR(20),
  ADD COLUMN IF NOT EXISTS business_type       VARCHAR(50);

-- WhatsApp session state machine
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone           VARCHAR(15) UNIQUE NOT NULL,
  current_state   VARCHAR(50) DEFAULT 'idle',
  context         JSONB DEFAULT '{}',
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ
);

-- Razorpay payments
CREATE TABLE IF NOT EXISTS payments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES users(id),
  razorpay_order_id    VARCHAR(50),
  razorpay_payment_id  VARCHAR(50),
  amount               INT NOT NULL,
  plan                 VARCHAR(20),
  status               VARCHAR(20) DEFAULT 'pending',
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for new tables
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments          ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on whatsapp_sessions" ON whatsapp_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on payments"          ON payments          FOR ALL USING (true) WITH CHECK (true);

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone  ON whatsapp_sessions(phone);
CREATE INDEX IF NOT EXISTS idx_payments_user_id         ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order  ON payments(razorpay_order_id);
