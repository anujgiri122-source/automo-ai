# Automo — AI Brain

India's first WhatsApp-first AI social media manager.

## Project
Built for Indian small businesses — gyms, salons, cafes, 
hotels, coaching centres, bike shops, saree shops.

## Team
- Anuj Goswami — Product Manager & CEO
- Adarsh Dixit — Marketing & Sales Head  
- Claude AI — Lead Developer & CTO

## Tech Stack
- Frontend: React.js
- Backend: Node.js
-  LWAYS Hinglish — natural mix of Hindi + English
- Human tone — like talking to a dost
- Never robotic, never pure English
- Use: "yaar", "dekho", "simple hai", "bilkul"Database: Supabase
- Hosting: Vercel
- Payment: Razorpay

## AI Stack
- Brain + Orchestrator: Claude API (Sonnet 4.6)
- Brand Detection: Gemini Vision API (free tier)
- Brand Flyers: Templated.io API (exact logo, pixel-perfect)
- Generic Flyers: Ideogram 3.0 API (best text accuracy 90%+)
- Auto Posting: Buffer API (5 platforms)
- WhatsApp: Baileys (open source)

## Core Unique Workflow
User WhatsApp message
→ Gemini Vision detects brand (old flyer / Instagram URL / shop photo)
→ Claude selects template + writes Hinglish caption
→ Templated.io renders exact logo stamp (pixel-perfect)
→ Claude quality check (score 1-10, re-render if below 8)
→ WhatsApp preview sent to user
→ User approves → Buffer auto-posts to 5 platforms

## Two Flyer Types
- GENERIC: Ideogram 3.0 → festivals, tips, motivation (no logo needed, ~₹5/image)
- BRAND: Templated.io → exact logo, brand colors, 99% accuracy (₹2.40/image)

## Smart Questions Feature
When user gives vague instruction, Claude predicts intelligently:
- "Post banao" → "Navratri special offer banau? Gym ke liye 20% off wala?"
- "Kuch bhi banao" → "Monday Motivation post banata hoon — coffee theme mein?"
- Always suggest before asking blank questions

## Pricing Plans
- Starter: ₹199/month — 30 posts, 2 platforms, generic flyers
- Pro: ₹499/month — 100 posts, 5 platforms, brand flyers, editing
- Agency: ₹899/month — unlimited, video ads, priority support
- Annual: ₹1,499/year — reduces churn

## Monthly Costs (Launch Phase)
- Claude API: ₹1,500
- Templated.io: ₹2,400 (1,000 renders)
- Ideogram API: ₹500 (~100 generic flyers)
- Buffer API: ₹500
- Total: ₹4,900/month
- Break even: 25 users

## Language Rules
## Language Rules
- Har caption DONO versions mein generate karo — Hinglish aur English
- HINGLISH VERSION: Natural Hindi + English mix, dost ki tarah, emojis use karo
- ENGLISH VERSION: Clean professional English, professional tone
- Indian festivals always aware
- Brand tone match karo dono mein
- Never robotic
- Use yaar, dekho, simple hai, bilkul — in Hinglish version only
## Quality Standard
- Every flyer Claude reviews before sending to user
- Score 1-10: below 8 = auto re-render, 8+ = send to user
- Logo exact placement always verify
- Brand colors always match

## Current Build Phase
Phase 1 — Caption Generator (Day 2-3)
Next: Brand Kit + Gemini Detection (Day 4-5)