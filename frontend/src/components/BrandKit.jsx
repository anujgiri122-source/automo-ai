import { useState, useRef } from 'react'
import './BrandKit.css'

const CATEGORIES = [
  { value: 'gym', label: '💪 Gym / Fitness Centre' },
  { value: 'salon', label: '💈 Hair & Beauty Salon' },
  { value: 'cafe', label: '☕ Cafe / Restaurant' },
  { value: 'hotel', label: '🏨 Hotel / Homestay' },
  { value: 'coaching', label: '📚 Coaching / Tuition' },
  { value: 'bike_shop', label: '🏍️ Bike / Auto Shop' },
  { value: 'saree_shop', label: '🥻 Saree / Clothing' },
  { value: 'general', label: '🏪 Other Business' },
]

const FONT_STYLES = [
  { value: 'modern', label: 'Modern' },
  { value: 'bold', label: 'Bold' },
  { value: 'elegant', label: 'Elegant' },
  { value: 'playful', label: 'Playful' },
]

export default function BrandKit() {
  const [businessName, setBusinessName] = useState('')
  const [category, setCategory] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#FF6600')
  const [secondaryColor, setSecondaryColor] = useState('#1c1c1c')
  const [fontStyle, setFontStyle] = useState('modern')
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [userId, setUserId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const handleLogoSelect = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Sirf image file upload karo (PNG, JPG)')
      return
    }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    setError('')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleLogoSelect(e.dataTransfer.files[0])
  }

  const handleSave = async () => {
    if (!businessName.trim()) {
      setError('Business name batao yaar!')
      return
    }
    if (!category) {
      setError('Category select karo.')
      return
    }

    setError('')
    setSaving(true)
    setSaved(false)

    try {
      // Step 1: Create/update user
      const userRes = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: businessName.trim(),
          category,
          whatsapp_number: whatsapp.trim() || undefined,
        }),
      })
      const userData = await userRes.json()
      if (!userRes.ok) throw new Error(userData.error)
      const uid = userData.user.id
      setUserId(uid)

      // Step 2: Upload logo if selected
      let logoUrl = null
      if (logoFile) {
        const formData = new FormData()
        formData.append('logo', logoFile)
        formData.append('user_id', uid)
        const logoRes = await fetch('/api/brand-kit/logo', {
          method: 'POST',
          body: formData,
        })
        const logoData = await logoRes.json()
        if (!logoRes.ok) throw new Error(logoData.error)
        logoUrl = logoData.logo_url
      }

      // Step 3: Save brand kit
      const kitRes = await fetch('/api/brand-kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: uid,
          logo_url: logoUrl,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          font_style: fontStyle,
        }),
      })
      const kitData = await kitRes.json()
      if (!kitRes.ok) throw new Error(kitData.error)

      setSaved(true)
    } catch (err) {
      setError(err.message || 'Save nahi hua, dobara try karo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="brand-kit">
      <div className="bk-header">
        <div className="bk-title">🎨 Brand Kit</div>
        <p className="bk-subtitle">Apni brand identity save karo — logo, colors, aur details</p>
      </div>

      {/* Business Info */}
      <div className="bk-section">
        <div className="bk-section-title">Business Details</div>
        <div className="bk-grid">
          <div className="field">
            <label>Business Name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Sharma Ji Ki Dukaan, FitZone Gym..."
              maxLength={100}
            />
          </div>
          <div className="field">
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">-- Select karo --</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>WhatsApp Number</label>
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+91 98765 43210"
              maxLength={15}
            />
          </div>
        </div>
      </div>

      {/* Logo Upload */}
      <div className="bk-section">
        <div className="bk-section-title">Business Logo</div>
        <div
          className={`logo-upload-zone ${dragOver ? 'drag-over' : ''} ${logoPreview ? 'has-logo' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {logoPreview ? (
            <div className="logo-preview-wrap">
              <img src={logoPreview} alt="Logo preview" className="logo-preview-img" />
              <button
                className="logo-remove-btn"
                onClick={(e) => { e.stopPropagation(); setLogoFile(null); setLogoPreview(null) }}
              >
                ✕ Remove
              </button>
            </div>
          ) : (
            <div className="upload-placeholder">
              <div className="upload-icon">📁</div>
              <div className="upload-text">Logo yahan drop karo ya click karo</div>
              <div className="upload-hint">PNG, JPG — max 5MB</div>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => handleLogoSelect(e.target.files[0])}
        />
      </div>

      {/* Brand Colors */}
      <div className="bk-section">
        <div className="bk-section-title">Brand Colors</div>
        <div className="colors-row">
          <div className="color-field">
            <label>Primary Color</label>
            <div className="color-input-wrap">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="color-picker"
              />
              <div className="color-swatch" style={{ background: primaryColor }} />
              <span className="color-hex">{primaryColor.toUpperCase()}</span>
            </div>
          </div>
          <div className="color-field">
            <label>Secondary Color</label>
            <div className="color-input-wrap">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="color-picker"
              />
              <div className="color-swatch" style={{ background: secondaryColor }} />
              <span className="color-hex">{secondaryColor.toUpperCase()}</span>
            </div>
          </div>
          <div className="color-field">
            <label>Font Style</label>
            <select value={fontStyle} onChange={(e) => setFontStyle(e.target.value)} className="font-select">
              {FONT_STYLES.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Brand Preview */}
      <div className="bk-section">
        <div className="bk-section-title">Live Preview</div>
        <div className="brand-preview" style={{ borderColor: primaryColor }}>
          <div className="preview-header" style={{ background: primaryColor }}>
            {logoPreview
              ? <img src={logoPreview} alt="logo" className="preview-logo" />
              : <div className="preview-logo-placeholder">LOGO</div>
            }
            <div className="preview-biz-name" style={{ color: '#fff' }}>
              {businessName || 'Aapka Business'}
            </div>
          </div>
          <div className="preview-body" style={{ background: secondaryColor }}>
            <div className="preview-tag" style={{ background: primaryColor }}>
              {CATEGORIES.find(c => c.value === category)?.label || '🏪 Your Business'}
            </div>
            <div className="preview-sample-text">
              Yeh aapka brand flyer kuch aisa dikhega!
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="error-box">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Save Button */}
      <button className="save-btn" onClick={handleSave} disabled={saving}>
        {saving ? (
          <><div className="spinner" /> Save ho raha hai...</>
        ) : saved ? (
          <>✅ Brand Kit Saved!</>
        ) : (
          <>💾 Save Brand Kit</>
        )}
      </button>

      {saved && userId && (
        <div className="success-box">
          ✅ Brand Kit save ho gaya! User ID: <code>{userId}</code>
        </div>
      )}
    </div>
  )
}
