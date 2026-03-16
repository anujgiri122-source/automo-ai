import { useState } from 'react'
import CaptionCard from './components/CaptionCard'
import './App.css'

const BUSINESS_TYPES = [
  { value: 'gym', label: '💪 Gym / Fitness Centre' },
  { value: 'salon', label: '💈 Hair & Beauty Salon' },
  { value: 'cafe', label: '☕ Cafe / Restaurant' },
  { value: 'hotel', label: '🏨 Hotel / Homestay' },
  { value: 'coaching', label: '📚 Coaching / Tuition' },
  { value: 'bike_shop', label: '🏍️ Bike / Auto Shop' },
  { value: 'saree_shop', label: '🥻 Saree / Clothing' },
  { value: 'general', label: '🏪 Other Business' },
]

const TOPIC_PLACEHOLDERS = [
  'Sunday se gym offer shuru ho raha hai, 30% off...',
  'Naya monsoon hair care package launch...',
  'Festival season special combo meal...',
  'Customer review — 5 star mili aaj...',
  'Free demo class this weekend...',
]

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-line short" />
      <div className="skeleton-line medium" style={{ marginTop: 16 }} />
      <div className="skeleton-line full" />
      <div className="skeleton-line full" />
      <div className="skeleton-line medium" />
    </div>
  )
}

export default function App() {
  const [businessType, setBusinessType] = useState('')
  const [topic, setTopic] = useState('')
  const [captions, setCaptions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [placeholder] = useState(
    () => TOPIC_PLACEHOLDERS[Math.floor(Math.random() * TOPIC_PLACEHOLDERS.length)]
  )

  const handleGenerate = async () => {
    if (!businessType) {
      setError('Pehle business type select karo yaar!')
      return
    }
    if (!topic.trim()) {
      setError('Topic bhi batao — kya post banana hai?')
      return
    }

    setError('')
    setLoading(true)
    setCaptions([])

    try {
      const res = await fetch('/api/generate-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessType, topic: topic.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Kuch gadbad ho gayi, try again karo.')
      }

      setCaptions(data.captions)
    } catch (err) {
      setError(err.message || 'Server se connect nahi ho pa raha. Check karo backend chal raha hai.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleGenerate()
    }
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="logo">
          <div className="logo-icon">⚡</div>
          <div className="logo-text">Auto<span>mo</span></div>
        </div>
        <p className="header-subtitle">AI Caption Generator — India ka apna social media manager</p>
      </header>

      {/* Input Form */}
      <div className="form-card">
        <div className="form-row">
          <div className="field">
            <label>Business Type</label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
            >
              <option value="">-- Select karo --</option>
              {BUSINESS_TYPES.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Topic / Instruction</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              maxLength={300}
            />
          </div>
        </div>

        {error && (
          <div className="error-box">
            <span>⚠️</span> {error}
          </div>
        )}

        <button
          className="generate-btn"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="spinner" />
              AI likh raha hai captions...
            </>
          ) : (
            <>
              ⚡ Generate 5 Captions
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {(loading || captions.length > 0) && (
        <div>
          <div className="section-heading">
            {loading ? 'Generating' : `${captions.length} Captions Ready`}
          </div>

          <div className="captions-grid">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
              : captions.map((cap) => <CaptionCard key={cap.style} caption={cap} />)
            }
          </div>
        </div>
      )}

      {/* Empty state — before first generation */}
      {!loading && captions.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">✍️</div>
          <p>Business select karo, topic batao — 5 killer captions ready!</p>
        </div>
      )}
    </div>
  )
}
