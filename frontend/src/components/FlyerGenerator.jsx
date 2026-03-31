import { useState, useEffect, useRef } from 'react'
import './FlyerGenerator.css'

// ── Question definitions (mirrors mcp/userPreferences.js) ─────────────────
const QUESTIONS = [
  {
    id: 'contentCategory',
    prompt: 'Kya banana hai aaj?',
    type: 'choice',
    options: [
      { emoji: '🎯', label: 'Offer/Sale',       value: 'offer' },
      { emoji: '🎉', label: 'Festival Post',     value: 'festival' },
      { emoji: '💡', label: 'Tips Carousel',     value: 'tips' },
      { emoji: '⭐', label: 'Customer Review',   value: 'testimonial' },
      { emoji: '🆕', label: 'Product Launch',    value: 'launch' },
      { emoji: '💪', label: 'Motivation Quote',  value: 'motivation' },
      { emoji: '📢', label: 'Announcement',      value: 'announcement' },
      { emoji: '📸', label: 'Behind Scenes',     value: 'behind_scenes' },
    ],
  },
  {
    id: 'format',
    prompt: 'Kahan post karna hai?',
    type: 'choice',
    options: [
      { emoji: '📱', label: 'WhatsApp Flyer only',    value: 'whatsapp_flyer' },
      { emoji: '📸', label: 'Instagram Feed only',     value: 'instagram_feed' },
      { emoji: '📖', label: 'Instagram Story only',    value: 'instagram_story' },
      { emoji: '🎠', label: 'Instagram Carousel',      value: 'instagram_carousel' },
      { emoji: '🚀', label: 'Full Campaign — sabhi',   value: 'full_campaign' },
    ],
  },
  {
    id: 'vibe',
    prompt: 'Post ka mood kya ho?',
    type: 'choice',
    options: [
      { emoji: '🔥', label: 'Bold & Aggressive',     value: 'bold' },
      { emoji: '🌸', label: 'Soft & Elegant',        value: 'elegant' },
      { emoji: '😄', label: 'Fun & Playful',         value: 'playful' },
      { emoji: '💼', label: 'Clean & Professional',  value: 'professional' },
      { emoji: '🎊', label: 'Festive & Celebratory', value: 'festive' },
    ],
  },
  {
    id: 'festival',
    prompt: 'Kaunsa festival hai? 🗓️',
    type: 'choice',
    options: [
      { emoji: '🗓️', label: 'Auto Detect Festival',  value: 'auto',      badge: 'Default' },
      { emoji: '💃', label: 'Navratri',               value: 'navratri' },
      { emoji: '🪔', label: 'Diwali',                 value: 'diwali' },
      { emoji: '🎨', label: 'Holi',                   value: 'holi' },
      { emoji: '🌙', label: 'Eid',                    value: 'eid' },
      { emoji: '🎄', label: 'Christmas',              value: 'christmas' },
      { emoji: '🎆', label: 'New Year',               value: 'new_year' },
      { emoji: '🚫', label: 'No Festival',            value: 'none' },
    ],
  },
  {
    id: 'language',
    prompt: 'Kis language mein?',
    type: 'choice',
    options: [
      { emoji: '🇮🇳', label: 'Hinglish — Best for India', value: 'hinglish' },
      { emoji: '🔤', label: 'Pure Hindi',                  value: 'hindi' },
      { emoji: '🇬🇧', label: 'English',                    value: 'english' },
    ],
  },
  {
    id: 'offerText',
    prompt: 'Kya offer ya message hai?',
    type: 'text',
    placeholder: 'e.g. Free delivery aaj ke liye, Holi special 40% off...',
  },
]

const FORMAT_LABELS = {
  whatsapp_flyer:      '📱 WhatsApp Flyer',
  instagram_feed:      '📸 Instagram Feed',
  instagram_story:     '📖 Instagram Story',
  instagram_carousel:  '🎠 Carousel',
  carousel_slide_hook:     'Slide 1 — Hook',
  carousel_slide_problem:  'Slide 2 — Problem',
  carousel_slide_solution: 'Slide 3 — Solution',
  carousel_slide_offer:    'Slide 4 — Offer',
  carousel_slide_cta:      'Slide 5 — CTA',
}

const LOADING_STEPS = [
  { icon: '🔍', text: 'Brand detect kar raha hoon...' },
  { icon: '🧠', text: 'AI brief bana raha hoon...' },
  { icon: '✅', text: 'Quality check ho raha hai...' },
  { icon: '🎨', text: 'Canva pe design ban raha hai...' },
]

// ── Copy helper ───────────────────────────────────────────────────────────
function useCopy() {
  const [copied, setCopied] = useState('')
  const copy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(''), 2000)
    })
  }
  return { copied, copy }
}

// ── Main component ─────────────────────────────────────────────────────────
export default function FlyerGenerator() {
  const [screen, setScreen] = useState('url')           // url | questions | loading | results
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [urlError, setUrlError] = useState('')
  const [currentQ, setCurrentQ] = useState(0)
  const [prefs, setPrefs] = useState({
    contentCategory: '', format: '', vibe: '', festival: 'auto', language: '', offerText: '',
  })
  const [offerInput, setOfferInput] = useState('')
  const [loadingStep, setLoadingStep] = useState(0)
  const [loadingScore, setLoadingScore] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const { copied, copy } = useCopy()
  const chatEndRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentQ, screen])

  // ── URL validation ────────────────────────────────────────────────────
  const handleUrlContinue = () => {
    const url = websiteUrl.trim()
    if (!url) { setUrlError('URL dalo please'); return }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setUrlError('URL https:// se shuru hona chahiye')
      return
    }
    setUrlError('')
    setScreen('questions')
    setCurrentQ(0)
  }

  // ── Choice selection ──────────────────────────────────────────────────
  const handleChoice = (questionId, value) => {
    const updated = { ...prefs, [questionId]: value }
    setPrefs(updated)
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(currentQ + 1)
    }
  }

  // ── Text submit (Q5) ──────────────────────────────────────────────────
  const handleOfferSubmit = () => {
    if (!offerInput.trim()) return
    const updated = { ...prefs, offerText: offerInput.trim() }
    setPrefs(updated)
    startGeneration(updated)
  }

  // ── Go back ───────────────────────────────────────────────────────────
  const handleBack = () => {
    if (currentQ === 0) {
      setScreen('url')
    } else {
      setCurrentQ(currentQ - 1)
    }
  }

  // ── Start generation ──────────────────────────────────────────────────
  const startGeneration = async (finalPrefs) => {
    setScreen('loading')
    setError('')
    setLoadingStep(0)
    setLoadingScore(null)

    // Animate loading steps
    const stepTimer = setInterval(() => {
      setLoadingStep(prev => {
        if (prev < LOADING_STEPS.length - 1) return prev + 1
        clearInterval(stepTimer)
        return prev
      })
    }, 5000)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl: websiteUrl.trim(), userPreferences: finalPrefs }),
      })

      clearInterval(stepTimer)

      // Guard: parse JSON safely — empty/truncated body throws "Unexpected end of JSON"
      let data
      try {
        data = await res.json()
      } catch {
        setError('Server se response nahi aaya. Please dobara try karo.')
        setScreen('questions')
        return
      }

      if (!res.ok) {
        setError(data?.error || 'Kuch gadbad ho gayi, dobara try karo.')
        setScreen('questions')
        return
      }

      if (data.qualityScore) setLoadingScore(data.qualityScore)
      setResult(data)
      setScreen('results')
    } catch (err) {
      clearInterval(stepTimer)
      setError(err.message || 'Server se connect nahi ho pa raha.')
      setScreen('questions')
    }
  }

  const handleReset = () => {
    setScreen('url')
    setWebsiteUrl('')
    setCurrentQ(0)
    setPrefs({ contentCategory: '', format: '', vibe: '', festival: 'auto', language: '', offerText: '' })
    setOfferInput('')
    setResult(null)
    setError('')
  }

  // ── SCREEN: URL INPUT ─────────────────────────────────────────────────
  if (screen === 'url') {
    return (
      <div className="fg-container">
        <div className="fg-url-card">
          <div className="fg-logo-row">
            <span className="fg-logo-icon">⚡</span>
            <span className="fg-logo-text">Automo AI</span>
          </div>
          <h2 className="fg-url-title">Apna content banao — 60 seconds mein</h2>
          <p className="fg-url-sub">Website URL dalo, baki AI karega</p>

          <div className="fg-url-field">
            <label className="fg-url-label">Business ki website URL</label>
            <input
              className={`fg-url-input${urlError ? ' fg-url-input--error' : ''}`}
              type="url"
              value={websiteUrl}
              onChange={e => { setWebsiteUrl(e.target.value); setUrlError('') }}
              onKeyDown={e => e.key === 'Enter' && handleUrlContinue()}
              placeholder="https://yourshop.com"
              autoFocus
            />
            {urlError && <span className="fg-field-error">{urlError}</span>}
          </div>

          <button className="fg-continue-btn" onClick={handleUrlContinue}>
            Continue <span className="fg-btn-arrow">→</span>
          </button>

          <p className="fg-url-examples">
            Try: amul.com &nbsp;·&nbsp; fabindia.com &nbsp;·&nbsp; yourgymbrand.com
          </p>
        </div>
      </div>
    )
  }

  // ── SCREEN: SMART QUESTIONS ───────────────────────────────────────────
  if (screen === 'questions') {
    const q = QUESTIONS[currentQ]
    const progress = ((currentQ) / QUESTIONS.length) * 100

    return (
      <div className="fg-container">
        <div className="fg-chat-card">
          {/* Header */}
          <div className="fg-chat-header">
            <button className="fg-back-btn" onClick={handleBack}>← Back</button>
            <span className="fg-progress-label">{currentQ + 1} / {QUESTIONS.length}</span>
          </div>

          {/* Progress bar */}
          <div className="fg-progress-bar">
            <div className="fg-progress-fill" style={{ width: `${progress}%` }} />
          </div>

          {/* URL indicator */}
          <div className="fg-url-chip">
            🌐 {websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
          </div>

          {/* Previous answers as chat bubbles */}
          <div className="fg-chat-history">
            {QUESTIONS.slice(0, currentQ).map((prevQ, i) => {
              const val = prefs[prevQ.id]
              const opt = prevQ.options?.find(o => o.value === val)
              const display = opt ? `${opt.emoji} ${opt.label}` : val
              return (
                <div key={i} className="fg-bubble-pair">
                  <div className="fg-bubble fg-bubble--bot">{prevQ.prompt}</div>
                  <div className="fg-bubble fg-bubble--user">{display}</div>
                </div>
              )
            })}
          </div>

          {/* Current question */}
          <div className="fg-current-question">
            <div className="fg-bubble fg-bubble--bot fg-bubble--active">
              {q.prompt}
            </div>

            {q.type === 'choice' && (
              <div className="fg-choices">
                {q.options.map(opt => (
                  <button
                    key={opt.value}
                    className={`fg-choice-btn${opt.badge ? ' fg-choice-btn--default' : ''}`}
                    onClick={() => handleChoice(q.id, opt.value)}
                  >
                    <span className="fg-choice-emoji">{opt.emoji}</span>
                    <span className="fg-choice-label">
                      {opt.label}
                      {opt.badge && <span className="fg-choice-badge">{opt.badge}</span>}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {q.type === 'text' && (
              <div className="fg-text-answer">
                <textarea
                  className="fg-text-input"
                  value={offerInput}
                  onChange={e => setOfferInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleOfferSubmit() } }}
                  placeholder={q.placeholder}
                  rows={3}
                  autoFocus
                />
                {error && <div className="fg-error">{error}</div>}
                <button
                  className="fg-submit-btn"
                  onClick={handleOfferSubmit}
                  disabled={!offerInput.trim()}
                >
                  Generate Content ⚡
                </button>
              </div>
            )}
          </div>
          <div ref={chatEndRef} />
        </div>
      </div>
    )
  }

  // ── SCREEN: LOADING ───────────────────────────────────────────────────
  if (screen === 'loading') {
    return (
      <div className="fg-container">
        <div className="fg-loading-card">
          <div className="fg-loading-orb" />
          <h3 className="fg-loading-title">Kaam ho raha hai...</h3>

          <div className="fg-loading-steps">
            {LOADING_STEPS.map((step, i) => {
              const state = i < loadingStep ? 'done' : i === loadingStep ? 'active' : 'pending'
              const text = i === 2 && loadingScore
                ? `${step.icon} Quality check (Score: ${loadingScore}/100)...`
                : `${step.icon} ${step.text}`
              return (
                <div key={i} className={`fg-loading-step fg-loading-step--${state}`}>
                  <span className="fg-step-icon">
                    {state === 'done' ? '✅' : state === 'active' ? '⏳' : '○'}
                  </span>
                  <span className="fg-step-text">{text}</span>
                </div>
              )
            })}
          </div>

          <p className="fg-loading-note">Thoda wait karo — quality 90+ chahiye ✨</p>
        </div>
      </div>
    )
  }

  // ── SCREEN: RESULTS ───────────────────────────────────────────────────
  if (screen === 'results' && result) {
    const cs = result.contentStrategy || {}
    const designs = result.designs || []

    return (
      <div className="fg-container fg-container--wide">

        {/* Header bar */}
        <div className="fg-results-header">
          <div className="fg-quality-badge" data-approved={result.qualityApproved}>
            {result.qualityApproved ? '✅' : '⚠️'} Quality Score: {result.qualityScore}/100
          </div>
          <button className="fg-new-btn" onClick={handleReset}>+ New Post</button>
        </div>

        {/* Brand strip */}
        <div className="fg-brand-strip">
          {result.brandData?.logoUrl && (
            <img className="fg-brand-logo" src={result.brandData.logoUrl} alt="logo" />
          )}
          <div className="fg-brand-info">
            <span className="fg-brand-name">{result.brandData?.name}</span>
            <span className="fg-brand-cat">{result.brandData?.category}</span>
          </div>
          {result.brandData?.colors?.length > 0 && (
            <div className="fg-color-dots">
              {result.brandData.colors.slice(0, 6).map((c, i) => (
                <div key={i} className="fg-color-dot" style={{ background: c }} title={c} />
              ))}
            </div>
          )}
        </div>

        {/* Designs grid */}
        <div className={`fg-designs-grid fg-designs-grid--${Math.min(designs.length, 3)}`}>
          {designs.map((design, i) => (
            <div key={i} className="fg-design-card">
              <div className="fg-design-header">
                <span className="fg-design-badge">
                  {FORMAT_LABELS[design.type] || design.type}
                </span>
                <span className="fg-design-size">{design.size}</span>
              </div>

              {/* Color palette preview */}
              <div className="fg-design-palette">
                {['primaryColor', 'secondaryColor', 'accentColor', 'backgroundColor'].map(key => {
                  const hex = design.designSpec?.[key]
                  return hex ? (
                    <div key={key} className="fg-palette-block" style={{ background: hex }} title={`${key}: ${hex}`}>
                      <span className="fg-palette-hex">{hex}</span>
                    </div>
                  ) : null
                })}
              </div>

              {/* Text content */}
              <div className="fg-design-texts">
                {design.textElements?.headline && (
                  <div className="fg-text-row fg-text-row--headline">
                    <span className="fg-text-label">Headline</span>
                    <span className="fg-text-value">{design.textElements.headline}</span>
                  </div>
                )}
                {design.textElements?.subheadline && (
                  <div className="fg-text-row">
                    <span className="fg-text-label">Subheadline</span>
                    <span className="fg-text-value">{design.textElements.subheadline}</span>
                  </div>
                )}
                {design.textElements?.offerBadge && (
                  <div className="fg-text-row fg-text-row--offer">
                    <span className="fg-text-label">Offer</span>
                    <span className="fg-text-value">{design.textElements.offerBadge}</span>
                  </div>
                )}
                {design.textElements?.cta && (
                  <div className="fg-text-row fg-text-row--cta">
                    <span className="fg-text-label">CTA</span>
                    <span className="fg-text-value">{design.textElements.cta}</span>
                  </div>
                )}
                {design.textElements?.footer && (
                  <div className="fg-text-row">
                    <span className="fg-text-label">Footer</span>
                    <span className="fg-text-value">{design.textElements.footer}</span>
                  </div>
                )}
              </div>

              {/* Canva query */}
              <div className="fg-canva-box">
                <div className="fg-canva-label">
                  <span>🎨 Canva Search Query</span>
                  <button
                    className={`fg-copy-btn${copied === `q${i}` ? ' fg-copy-btn--done' : ''}`}
                    onClick={() => copy(design.canvaSearchQuery, `q${i}`)}
                  >
                    {copied === `q${i}` ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <p className="fg-canva-query">{design.canvaSearchQuery}</p>
              </div>

              {/* Indian elements */}
              {design.designSpec?.indianElements?.length > 0 && (
                <div className="fg-elements">
                  {design.designSpec.indianElements.map((el, j) => (
                    <span key={j} className="fg-element-tag">{el}</span>
                  ))}
                </div>
              )}

              {/* Festival tie-in */}
              {design.festivalTieIn && (
                <div className="fg-festival-note">🎊 {design.festivalTieIn}</div>
              )}
            </div>
          ))}
        </div>

        {/* Content Strategy */}
        <div className="fg-strategy-card">
          <h3 className="fg-strategy-title">📋 Content Strategy</h3>

          <div className="fg-strategy-grid">
            {cs.instagramCaption && (
              <div className="fg-strategy-item">
                <div className="fg-strategy-item-header">
                  <span>📸 Instagram Caption</span>
                  <button
                    className={`fg-copy-btn${copied === 'caption' ? ' fg-copy-btn--done' : ''}`}
                    onClick={() => copy(cs.instagramCaption, 'caption')}
                  >
                    {copied === 'caption' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <p className="fg-strategy-text">{cs.instagramCaption}</p>
              </div>
            )}

            {cs.whatsappMessage && (
              <div className="fg-strategy-item">
                <div className="fg-strategy-item-header">
                  <span>💬 WhatsApp Message</span>
                  <button
                    className={`fg-copy-btn${copied === 'wa' ? ' fg-copy-btn--done' : ''}`}
                    onClick={() => copy(cs.whatsappMessage, 'wa')}
                  >
                    {copied === 'wa' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <p className="fg-strategy-text">{cs.whatsappMessage}</p>
              </div>
            )}

            {cs.hashtags?.length > 0 && (
              <div className="fg-strategy-item">
                <div className="fg-strategy-item-header">
                  <span>#️⃣ Hashtags</span>
                  <button
                    className={`fg-copy-btn${copied === 'hash' ? ' fg-copy-btn--done' : ''}`}
                    onClick={() => copy(cs.hashtags.join(' '), 'hash')}
                  >
                    {copied === 'hash' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <p className="fg-strategy-text">{cs.hashtags.join('  ')}</p>
              </div>
            )}

            {cs.bestPostTime && (
              <div className="fg-strategy-item fg-strategy-item--highlight">
                <span className="fg-strategy-item-header">⏰ Best Post Time</span>
                <p className="fg-strategy-text">{cs.bestPostTime}</p>
              </div>
            )}
          </div>

          {cs.contentTip && (
            <div className="fg-tip-box">
              <span className="fg-tip-icon">💡</span>
              <span className="fg-tip-text">{cs.contentTip}</span>
            </div>
          )}
        </div>

        {/* Quality issues (if any) */}
        {result.qualityIssues?.length > 0 && (
          <div className="fg-issues-card">
            <h4 className="fg-issues-title">⚠️ Quality Notes</h4>
            <ul className="fg-issues-list">
              {result.qualityIssues.map((issue, i) => <li key={i}>{issue}</li>)}
            </ul>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>
    )
  }

  return null
}
