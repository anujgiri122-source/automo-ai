import { useState } from 'react'
import './CaptionCard.css'

const STYLE_ICONS = {
  urgency: '🔥',
  story: '📖',
  education: '💡',
  social_proof: '⭐',
  festival: '✨',
}

export default function CaptionCard({ caption }) {
  const [lang, setLang] = useState('hinglish')
  const [copied, setCopied] = useState(false)

  const currentText = lang === 'hinglish' ? caption.hinglish : caption.english

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback for older browsers
      const ta = document.createElement('textarea')
      ta.value = currentText
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="caption-card">
      <div className="card-header">
        <div className="style-badge">
          <div className="style-icon">{STYLE_ICONS[caption.style] || '✏️'}</div>
          <div className="style-info">
            <span className="style-name">{caption.label}</span>
            <span className="style-desc">{caption.description}</span>
          </div>
        </div>

        <div className="lang-toggle">
          <button
            className={`lang-btn ${lang === 'hinglish' ? 'active' : ''}`}
            onClick={() => setLang('hinglish')}
          >
            HIN
          </button>
          <button
            className={`lang-btn ${lang === 'english' ? 'active' : ''}`}
            onClick={() => setLang('english')}
          >
            ENG
          </button>
        </div>
      </div>

      <div className="caption-body">
        <p className="caption-text">{currentText}</p>
      </div>

      <div className="card-footer">
        <span className="char-count">{currentText?.length || 0} chars</span>
        <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
          <span className="copy-icon">{copied ? '✓' : '⎘'}</span>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  )
}
