# AUTOMO AI — SKILLS & PROJECT MEMORY

## ROLE
Claude Code = Builder only.
Strategy + prompts = handled in Claude.ai chat.
Do not over-engineer. Ask before adding dependencies.

---

## WHAT WE ARE BUILDING
WhatsApp-first customer acquisition system.
Owner sends one message → content created → posted → 
leads captured → owner notified.
NO laptop needed. Everything via WhatsApp.

---

## ALREADY WORKING
- Green API ✅ (WhatsApp send/receive)
- Project structure ✅

---

## TECH STACK
- Node.js + Express
- BullMQ + Redis (job queues)
- Supabase (Postgres database)
- Claude API claude-sonnet-4-20250514
- Green API (WhatsApp)
- Buffer API (Instagram/Facebook posting)
- HTML → image (flyer generation, MVP)

---

## ENV VARIABLES REQUIRED
GREEN_API_INSTANCE_ID=
GREEN_API_TOKEN=
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
BUFFER_ACCESS_TOKEN=
REDIS_URL=

---

## FOLDER STRUCTURE
/src
  /webhooks       → Green API incoming messages
  /router         → intent classifier
  /caption        → Claude caption generator
  /design         → HTML→image flyer builder
  /posting        → Buffer API
  /leads          → lead detection + auto-reply
  /notifications  → owner WhatsApp alerts
  /queues         → BullMQ job definitions
  /db             → all Supabase queries
/prompts          → Claude system prompts (DO NOT edit in code)
CLAUDE.md         → this file
.env

---

## SUPABASE TABLES

users
- id uuid PK
- whatsapp_number text
- business_name text
- language text default 'hinglish'
- created_at timestamp

brand_kits
- id uuid PK
- user_id uuid FK
- primary_color text
- secondary_color text
- tone text
- logo_url text

posts
- id uuid PK
- user_id uuid FK
- caption text
- flyer_url text
- status text (draft/approved/posted)
- platform text
- scheduled_at timestamp

captions
- id uuid PK
- post_id uuid FK
- style text
- text text
- cta text

leads
- id uuid PK
- user_id uuid FK
- lead_number text
- name text
- intent text
- message text
- created_at timestamp

automations
- id uuid PK
- user_id uuid FK
- mode text (auto/manual)
- frequency text
- last_run timestamp

---

## INTENT TYPES
CONTENT_REQUEST  → owner wants to create post
LEAD_PRICE       → customer asking about price
LEAD_BOOKING     → customer wants to book
LEAD_ENQUIRY     → general customer question
APPROVE          → owner approving content (reply: 1-5)
REGENERATE       → owner wants new version (reply: r)
AUTO_MODE        → owner toggling auto schedule

---

## SKILL: CAPTION GENERATOR
File: /src/caption/generator.js

Input:  { userMessage, businessName, language }
Output: Array of 5 captions with CTA

5 styles (always generate all 5):
1. hinglish_casual
2. emotional_story
3. offer_focused
4. curiosity_hook
5. direct_cta

Rules:
- Default language = Hinglish
- Each caption max 150 chars
- Every caption must have one CTA line
- Run parallel with flyer generation (Promise.all)

---

## SKILL: FLYER GENERATOR
File: /src/design/flyer.js

Input:  { caption, brandKit, offerText }
Output: image URL (base64 or hosted)

MVP flow:
1. Build HTML string with offer text + colors
2. Use puppeteer to screenshot → buffer
3. Upload to Supabase storage
4. Return public URL

Fallback: send text-only message if image fails

---

## SKILL: INTENT ROUTER
File: /src/router/intent.js

Input:  incoming WhatsApp message object
Output: { intent, userId, payload }

Logic:
- If message contains price/cost/kitna → LEAD_PRICE
- If message contains book/slot/appointment → LEAD_BOOKING
- If message is "1" to "5" → APPROVE
- If message is "r" or "regenerate" → REGENERATE
- If message is "auto on/off" → AUTO_MODE
- Else if from owner → CONTENT_REQUEST
- Else → LEAD_ENQUIRY

Owner detection: check if sender = users.whatsapp_number

---

## SKILL: LEAD AUTO-REPLY
File: /src/leads/autoReply.js

Input:  { intent, leadNumber, businessName }
Output: sends WhatsApp reply + saves lead + notifies owner

CTA Templates:

LEAD_PRICE:
"Sir abhi special offer chal raha hai 🎉
[PRICE] mein milega.
Book karne ke liye reply karein — slots kam hain!"

LEAD_BOOKING:
"Bilkul! Aapka naam aur preferred time batayein 😊
Hum confirm kar denge."

LEAD_ENQUIRY:
"Namaskar! Kaise help kar sakte hain aapki? 🙏"

Owner notification format:
"🔔 New Lead!
Number: [LEAD_NUMBER]
Intent: [INTENT]
Message: [MESSAGE]"

---

## SKILL: BUFFER POSTING
File: /src/posting/buffer.js

Input:  { caption, imageUrl, scheduledTime }
Output: Buffer post ID

Platforms: Instagram + Facebook
Timing: post immediately or schedule to next best time
Fallback: log failure + notify owner on WhatsApp

---

## SKILL: GREEN API WEBHOOK
File: /src/webhooks/greenApi.js

Receives all incoming WhatsApp messages.
Extracts: sender number, message text, timestamp
Passes to intent router immediately.
Response time target: < 2 seconds from receipt.

---

## APPROVE / REGENERATE FLOW
1. After captions generated → send preview on WhatsApp
2. Format:
   "Reply 1-5 to approve a caption
    Reply r to regenerate
    
    1. [caption 1]
    2. [caption 2]
    3. [caption 3]
    4. [caption 4]
    5. [caption 5]"
3. On "1-5" → save approved caption → trigger Buffer post
4. On "r" → regenerate ONCE → send new preview
5. On second "r" → send same options again (no loop)

---

## BULLMQ JOBS
caption_generation   → generate 5 captions
flyer_generation     → build HTML→image
post_scheduling      → send to Buffer
lead_notification    → alert owner
auto_content         → weekly auto mode

All jobs: retry 3x on failure, log every attempt

---

## BUILD ORDER (follow exactly)
1. ✅/🔄 Green API webhook receiver
2. ✅/🔄 Intent router
3. ✅/🔄 Caption generator (Claude API)
4. ✅/🔄 Flyer generator (HTML→image)
5. ✅/🔄 Approve/regenerate WhatsApp flow
6. ✅/🔄 Buffer posting
7. ✅/🔄 Lead auto-reply + owner notification

Update ✅ when module is complete.

---

## PERFORMANCE RULES
- Webhook → first reply < 10 seconds always
- Caption + flyer generation: Promise.all (parallel)
- Never block the main thread
- Every BullMQ job must log start + end + errors
- No console.log in production — use proper logger

---

## WHAT NOT TO BUILD IN MVP
❌ Analytics dashboard
❌ Web UI / admin panel
❌ Canva integration (later)
❌ Brand scraping (later)
❌ Advanced scheduling
❌ Payment integration
