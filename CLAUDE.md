# AUTOMO AI — CLAUDE.md v3.0 (MCP-First Architecture)

## What is Automo?
WhatsApp-first AI social media manager for Indian small businesses.
User sends WhatsApp message → gets captions + branded posters → auto-posted to Instagram.

## Tech Stack (FINAL — DO NOT ADD OR CHANGE)
- Backend: Node.js + Express (port 5000)
- Frontend: React.js (port 3002)
- Database: Supabase (ALREADY CONNECTED)
- AI Brain: Claude API Sonnet 4.6 (for captions, intent detection, design prompts)
- Design Engine: Canva via MCP (https://mcp.canva.com/mcp)
- Data Scraping: Apify via MCP (https://mcp.apify.com/)
- WhatsApp: GREEN-API (green-api.com) — FREE, webhook-based, Instance: 7107570235
- Auto Posting: Buffer API
- Payments: Razorpay
- Hosting: Vercel (frontend) + VPS (WhatsApp bot)

## REMOVED (DO NOT USE)
- ❌ Ideogram API — REMOVED
- ❌ Groq SDK — REMOVED
- ❌ OpenAI — REMOVED
- ❌ Google Generative AI / Gemini — REMOVED
- ❌ NVIDIA API — REMOVED
- ❌ Together API — REMOVED
- ❌ fal.ai — REMOVED
- ❌ Templated.io — NEVER USED
- ❌ flyer-engine/ folder — DELETED
- ❌ n8n — NOT NEEDED
- ❌ Baileys — REMOVED, replaced by GREEN-API
- ❌ AiSensy — REMOVED, replaced by GREEN-API

## Three-Layer Data Engine
Layer 1: USER CONVERSATION → Questions collect business name, type, link
Layer 2: APIFY MCP SCRAPING → Website/Instagram/Maps → logo, colors, content
Layer 3: CLAUDE + CANVA MCP → Captions + stunning branded designs

## Logo Flow (CRITICAL)
1. User sends logo image on WhatsApp OR Apify extracts from website
2. Logo saved to Supabase Storage (gets public URL)
3. Canva MCP: upload-asset-from-url(logo_url) → returns asset_id
4. asset_id saved in brand_kits.canva_logo_asset_id
5. Every design request: generate-design(query, asset_ids: [canva_logo_asset_id])
6. Result: Branded design WITH actual logo

## Design Prompt Architect (CRITICAL)
Before calling Canva MCP, Claude must create a DETAILED design prompt:
- Inject brand_kit data (name, colors, logo asset_id, tagline, phone, address)
- Specify layout, typography, style, mood, imagery
- Include business-type defaults (gym=bold/dark, salon=elegant/pastel, cafe=warm/cozy)
- Include festival context if relevant (Diwali=gold, Holi=colorful, Eid=green)
- Output: One detailed paragraph prompt for Canva

## Backend Structure
backend/
├── server.js              ← Clean 55-line Express server
├── supabase.js            ← Supabase client (WORKING)
├── .env                   ← ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY
├── routes/
│   ├── captions.js        ← Caption generation (Claude API) — EXISTS
│   ├── flyer.js           ← Flyer generation — NEEDS Canva MCP integration
│   ├── credits.js         ← Usage tracking — EXISTS
│   ├── post.js            ← Post logging — EXISTS
│   ├── payment.js         ← Razorpay — NEEDS CREATION
│   └── buffer.js          ← Buffer OAuth — NEEDS CREATION

## WhatsApp Structure
whatsapp/
├── botEngine.js           ← Central message router — EXISTS
├── stateMachine.js        ← State management — EXISTS
└── flows/
    ├── onboardingFlow.js  ← New user setup — EXISTS
    ├── captionFlow.js     ← Caption request/approval — EXISTS
    ├── flyerFlow.js       ← Flyer request — EXISTS
    ├── postingFlow.js     ← Post to Instagram — EXISTS
    └── helpFlow.js        ← Help menu — EXISTS

## MCP Structure
mcp/
├── canva-flyer.js         ← Canva MCP integration — EXISTS (needs update)
├── indianDesignRules.js   ← Design rules — EXISTS
├── qualityMemory.json     ← Quality tracking — EXISTS
└── userPreferences.js     ← User prefs — EXISTS

## Supabase Tables Needed
- users (phone, business_name, business_type, plan, usage counters, buffer_access_token)
- brand_kits (user_id, logo_url, canva_logo_asset_id, colors, tagline, phone, address)
- captions (user_id, prompt, generated_captions JSONB, selected_index, status)
- flyers (user_id, type, prompt, image_url, canva_design_url)
- whatsapp_sessions (phone, current_state, context JSONB, expires_at)
- payments (user_id, razorpay_order_id, amount, plan, status)

## WhatsApp Bot States
IDLE → ONBOARDING_NAME → ONBOARDING_TYPE → ONBOARDING_LINK →
CAPTION_REQUESTED → CAPTION_SELECTED → FLYER_REQUESTED →
POST_CONFIRM → SCHEDULE_TIME → PAYMENT_PENDING

## Caption Generation Rules
- Always 5 captions: 3 Hinglish + 2 English
- Include 3-5 hashtags per caption
- Include emojis naturally
- Tone: Warm, local, relatable
- Each caption different style (motivational, funny, informational, offer, storytelling)
- Output: Strict JSON array

## Intent Detection (Claude Haiku — cheaper)
Intents: caption_request, flyer_request, carousel_request, approve,
post_now, schedule, brand_setup, help, pricing, greeting, unknown

## Pricing Tiers
Free: 10 captions/mo, 3 flyers/mo, 5 posts/mo
Starter ₹199/mo: 50 captions, 15 flyers, 30 posts
Pro ₹499/mo: Unlimited captions, 50 flyers, unlimited posts

## Key Rules for Claude Code
1. NEVER add packages not in tech stack
2. NEVER use OpenAI, Groq, Gemini, or any other AI provider
3. All designs through Canva MCP only — never direct Canva API
4. All scraping through Apify MCP only
5. Brand kit data MUST be injected into every design prompt
6. Logo MUST use asset_ids parameter in Canva generate-design
7. WhatsApp responses must feel human — emojis, Hinglish, numbered options
8. Every flow must have error handling and fallback messages
9. Session timeout: 30 minutes → reset to IDLE
10. DO NOT modify existing working code unless explicitly asked

## Current Status (March 2026)
✅ DONE: Project setup, server.js, supabase connection
✅ DONE: Caption route (Claude API — TODO stub, ready to plug in)
✅ DONE: Flyer route — design prompt architect, logo upload placeholder, Canva MCP TODO
✅ DONE: Credits route, Post log route
✅ DONE: Payment route (Razorpay)
✅ DONE: Buffer OAuth route
✅ DONE: WhatsApp stateMachine.js — all states + 30min session timeout
✅ DONE: WhatsApp botEngine.js — keyword routing + session management
✅ DONE: WhatsApp onboardingFlow.js — name/type/link collection
✅ DONE: WhatsApp helpFlow.js
✅ DONE: MCP canva-flyer.js — smart Canva query builder
✅ DONE: MCP indianDesignRules.js, userPreferences.js, qualityMemory.json
✅ DONE: backend/routes/logoExtractor.js
✅ DONE: GREEN-API webhook integration (replaces Baileys + AiSensy)
✅ DONE: captionFlow.js, flyerFlow.js, postingFlow.js
✅ DONE: Supabase 6 tables created
✅ DONE: designArchitect.js service

⬜ NEXT: Supabase tables creation (run supabase_schema.sql)
⬜ NEXT: Frontend BrandKit + FlyerGenerator components wire-up

⬜ LATER (needs credits/tokens):
  → Canva MCP real calls (replace TODO in flyer.js + canva-flyer.js)
  → Apify MCP scraping (replace TODO in logoExtractor.js)
  → Claude API caption generation (replace TODO in captions.js)
  → Claude API intent detection in botEngine.js
