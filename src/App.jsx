import { useState, useEffect, useRef, useCallback } from 'react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer
} from 'recharts'
import {
  Activity, AlertTriangle, CheckCircle, FileX, BarChart2,
  Upload, Database, Zap, ShieldCheck, Save, TrendingUp,
  AlertCircle, ServerCrash, ChevronLeft
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { gsap } from 'gsap'
import NeuralBackground from './NeuralBackground'
import LandingPage from './LandingPage'
import PipelineTracker from './PipelineTracker'
import './index.css'

const API_BASE = import.meta.env.VITE_API_URL || (
  typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8000'
    : ''
)

/* ════════════════════════════════════════════
   FRAMER VARIANTS
   ════════════════════════════════════════════ */
const tabAnim = {
  hidden:  { opacity: 0, x: 14 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, x: -14, transition: { duration: 0.18 } }
}

/* ════════════════════════════════════════════
   SPLASH SCREEN  (3-second branded loader)
   ════════════════════════════════════════════ */
const SplashScreen = ({ onComplete }) => {
  const [step,     setStep]     = useState(0)
  const [progress, setProgress] = useState(0)

  const steps = ['Initializing AI Core...', 'Loading PLM Schema...', 'Connecting SAP Gateway...', 'System Ready.']

  useEffect(() => {
    const TOTAL = 3000
    const stepMs = TOTAL / steps.length
    const stepTimers = steps.map((_, i) => setTimeout(() => setStep(i), i * stepMs))
    const iv = setInterval(() => setProgress(p => Math.min(p + (100 / (TOTAL / 40)), 100)), 40)
    const done = setTimeout(onComplete, TOTAL + 200)
    return () => { stepTimers.forEach(clearTimeout); clearInterval(iv); clearTimeout(done) }
  }, [onComplete])

  return (
    <motion.div
      className="splash-screen"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] } }}
    >
      <NeuralBackground />
      <div className="splash-logo-wrapper">
        <motion.div className="splash-hex"
          initial={{ scale: 0, rotate: -45, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ duration: 0.75, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <div className="splash-hex-ring" />
          <div className="splash-hex-inner"><span className="splash-hex-icon">AI</span></div>
        </motion.div>

        <motion.div className="splash-brand"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="splash-brand-name">AUTONOMOUS CORE</div>
          <div className="splash-tagline">Enterprise PLM Intelligence Platform</div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.4 }}
          style={{ textAlign: 'center', marginTop: '4px' }}>
          <AnimatePresence mode="wait">
            <motion.div key={step} className="splash-status"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >{steps[step]}</motion.div>
          </AnimatePresence>
        </motion.div>

        <motion.div className="splash-progress-track"
          initial={{ opacity: 0, scaleX: 0.6 }} animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.9, duration: 0.4 }}
        >
          <div className="splash-progress-bar" style={{ width: `${progress}%`, transition: 'width 0.1s linear' }} />
        </motion.div>
      </div>
    </motion.div>
  )
}

/* ════════════════════════════════════════════
   ANIMATED COUNT-UP
   ════════════════════════════════════════════ */
const AnimatedNumber = ({ value }) => {
  const [display, setDisplay] = useState(0)
  const prev = useRef(0)
  useEffect(() => {
    const end = Number(value) || 0
    const start = prev.current
    if (start === end) return
    const dur = 700, t0 = performance.now()
    const tick = (now) => {
      const p = Math.min((now - t0) / dur, 1)
      setDisplay(Math.round(start + (end - start) * (1 - Math.pow(1 - p, 3))))
      if (p < 1) requestAnimationFrame(tick)
      else prev.current = end
    }
    requestAnimationFrame(tick)
  }, [value])
  return <>{display}</>
}

/* ════════════════════════════════════════════
   CUSTOM RECHARTS TOOLTIP
   ════════════════════════════════════════════ */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="custom-tooltip">
      {label && <div className="label">{label}</div>}
      {payload.map((p, i) => <div key={i} className="value" style={{ color: p.fill || p.color }}>{p.value}</div>)}
    </div>
  )
}

/* ════════════════════════════════════════════
   MAIN APP
   ════════════════════════════════════════════ */
export default function App() {
  // view: 'splash' | 'landing' | 'dashboard'
  const [view, setView] = useState(() =>
    sessionStorage.getItem('splashShown') ? 'landing' : 'splash'
  )

  const [sessionId, setSessionId] = useState(null)
  const [status,    setStatus]    = useState('idle')
  const [logs,      setLogs]      = useState([])
  const [records,   setRecords]   = useState([])
  const [kpis,      setKpis]      = useState({ total_records: 0, sap_posted: 0, sap_failed: 0 })
  const [activeTab, setActiveTab] = useState('logs')
  const [uploadError, setUploadError] = useState(null)
  const [modalOpen,         setModalOpen]         = useState(false)
  const [currentEditRecord, setCurrentEditRecord] = useState(null)
  const [editValue,         setEditValue]         = useState('')
  const [masterDataOptions, setMasterDataOptions] = useState(null)

  const fileInputRef = useRef(null)
  const logsEndRef   = useRef(null)
  const tabsRef      = useRef({})
  const tabsWrapRef  = useRef(null)
  const headerRef    = useRef(null)
  const kpiRef       = useRef(null)
  const mainRef      = useRef(null)

  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0 })

  /* ── Splash complete → landing ───────── */
  const handleSplashComplete = useCallback(() => {
    sessionStorage.setItem('splashShown', 'true')
    setView('landing')
  }, [])

  /* ── Landing → dashboard ─────────────── */
  const handleEnterDashboard = useCallback(() => {
    setView('dashboard')
  }, [])

  /* ── Tab slider ──────────────────────── */
  const updateSlider = useCallback((el) => {
    if (!el || !tabsWrapRef.current) return
    const wrap = tabsWrapRef.current.getBoundingClientRect()
    const tab  = el.getBoundingClientRect()
    setSliderStyle({ left: tab.left - wrap.left, width: tab.width })
  }, [])

  useEffect(() => {
    const el = tabsRef.current[activeTab]
    if (el) updateSlider(el)
  }, [activeTab, updateSlider])

  /* ── GSAP entrance after entering dashboard ── */
  useEffect(() => {
    if (view !== 'dashboard') return
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
    if (headerRef.current)
      tl.fromTo(headerRef.current, { opacity: 0, y: -28, filter: 'blur(6px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.65 }, 0)
    if (kpiRef.current) {
      const cards = kpiRef.current.querySelectorAll('.kpi-card')
      tl.fromTo(cards, { opacity: 0, y: 36, filter: 'blur(4px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.55, stagger: 0.1 }, 0.15)
    }
    if (mainRef.current)
      tl.fromTo(mainRef.current, { opacity: 0, y: 28, filter: 'blur(4px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.6 }, 0.35)
    return () => tl.kill()
  }, [view])

  /* ── SSE stream ──────────────────────── */
  useEffect(() => {
    if (!sessionId) return
    const es = new EventSource(`${API_BASE}/stream/${sessionId}`)
    es.addEventListener('log', (e) => {
      const log = JSON.parse(e.data)
      log.timestamp = new Date().toLocaleTimeString()
      setLogs(prev => [...prev, log])
    })
    es.addEventListener('state', (e) => {
      const s = JSON.parse(e.data)
      if (s.records) setRecords(s.records)
      if (s.kpis)    setKpis(s.kpis)
    })
    // Backend sends 'done' when session expires — close to free connection slot
    es.addEventListener('done', () => es.close())
    return () => es.close()
  }, [sessionId])

  /* ── Auto-scroll logs ────────────────── */
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '' // reset so same file can be re-uploaded
      fileInputRef.current.click()
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadError(null)
    // Clear old session FIRST — this closes the old EventSource (frees connection slots)
    setSessionId(null)
    setStatus('uploading'); setLogs([]); setRecords([])
    const fd = new FormData(); fd.append('file', file)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)

    try {
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST', body: fd, signal: controller.signal
      })
      clearTimeout(timer)
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data = await res.json()
      setSessionId(data.session_id)
      setStatus('processing')
      setActiveTab('logs')
    } catch (err) {
      clearTimeout(timer)
      console.error('Upload failed:', err)
      const msg = err.name === 'AbortError'
        ? 'Upload timed out. Make sure the backend server is responding.'
        : err.message || 'Upload failed. Could not reach backend server.'
      setUploadError(msg)
      setStatus('idle')
    }
  }

  const fixAllAI = async (errorType) => {
    try {
      const res = await fetch(`${API_BASE}/fix/ai/${sessionId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error_type: errorType })
      })
      if (!res.ok) throw new Error(`Fix failed: ${res.status}`)
    } catch (err) { console.error('AI fix error:', err) }
  }

  const openManualFix = async (record) => {
    setCurrentEditRecord(record)
    setEditValue(record.data[record.error_field])
    setMasterDataOptions(null)
    setModalOpen(true)
    if (record.error_msg?.toLowerCase().includes('master data')) {
      try {
        const res  = await fetch(`${API_BASE}/master-data/${record.error_field.toLowerCase()}`)
        const data = await res.json()
        setMasterDataOptions(data.values)
        if (data.values?.length > 0) setEditValue(data.values[0])
      } catch (err) { console.error(err) }
    }
  }

  const submitManualFix = async () => {
    try {
      const res = await fetch(`${API_BASE}/fix/manual/${sessionId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record_id: currentEditRecord.id, field: currentEditRecord.error_field, new_value: editValue })
      })
      if (!res.ok) throw new Error(`Manual fix failed: ${res.status}`)
      setModalOpen(false)
    } catch (err) { console.error('Manual fix error:', err) }
  }

  /* ── Derived state ───────────────────── */
  const formatErrors     = records.filter(r => r.error_type === 'format'     && r.status === 'pending')
  const validationErrors = records.filter(r => r.error_type === 'validation' && r.status === 'pending')

  const pieData = [
    { name: 'Format Errors',     value: formatErrors.length,                                 color: '#06b6d4' },
    { name: 'Validation Errors', value: validationErrors.length,                             color: '#f59e0b' },
    { name: 'Clean / Fixed',     value: records.filter(r => r.error_type === 'none').length, color: '#22c55e' }
  ].filter(d => d.value > 0)

  const barData = [
    { name: 'AI Fixed',     count: records.filter(r => r.fixed_by === 'ai').length,     fill: '#3b82f6' },
    { name: 'Manual Fixed', count: records.filter(r => r.fixed_by === 'manual').length, fill: '#8b5cf6' },
    { name: 'Pending',      count: records.filter(r => r.status  === 'pending').length, fill: '#ef4444' }
  ]

  const TABS = [
    { id: 'logs',       label: 'Execution Logs', icon: <Activity size={14} />,       badge: null },
    { id: 'format',     label: 'Format Errors',  icon: <FileX size={14} />,           badge: formatErrors.length },
    { id: 'validation', label: 'Validation',      icon: <AlertTriangle size={14} />,  badge: validationErrors.length },
    { id: 'analysis',   label: 'Analysis',        icon: <BarChart2 size={14} />,      badge: null },
  ]

  const KPI_CARDS = [
    { label: 'Total Records',      value: kpis.total_records || 0, icon: <Database size={16} />,      iconClass: 'blue',  valueClass: 'blue',  trend: 'Processed this session',      glow: 'linear-gradient(90deg,transparent,rgba(59,130,246,0.65),transparent)' },
    { label: 'Format Errors',      value: formatErrors.length,     icon: <FileX size={16} />,          iconClass: formatErrors.length     ? 'cyan'  : 'green', valueClass: formatErrors.length     ? 'cyan'  : 'green', trend: formatErrors.length     ? 'Pending resolution'    : 'All clear',          glow: formatErrors.length     ? 'linear-gradient(90deg,transparent,rgba(6,182,212,0.65),transparent)'   : 'linear-gradient(90deg,transparent,rgba(34,197,94,0.65),transparent)' },
    { label: 'Validation Errors',  value: validationErrors.length, icon: <AlertTriangle size={16} />,  iconClass: validationErrors.length ? 'amber' : 'green', valueClass: validationErrors.length ? 'amber' : 'green', trend: validationErrors.length ? 'Business rule failures' : 'All rules passed',    glow: validationErrors.length ? 'linear-gradient(90deg,transparent,rgba(245,158,11,0.65),transparent)' : 'linear-gradient(90deg,transparent,rgba(34,197,94,0.65),transparent)' },
  ]

  /* ════════════════════════════════════════
     RENDER
     ════════════════════════════════════════ */
  return (
    <>
      <AnimatePresence mode="wait">

        {/* ── SPLASH ──────────────────────── */}
        {view === 'splash' && (
          <SplashScreen key="splash" onComplete={handleSplashComplete} />
        )}

        {/* ── LANDING ─────────────────────── */}
        {view === 'landing' && (
          <LandingPage key="landing" onEnter={handleEnterDashboard} />
        )}

        {/* ── DASHBOARD ───────────────────── */}
        {view === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Live Three.js neural background — z:0, shows through glass panels z:10 */}
            <NeuralBackground />

            {/* Subtle colour veil at z:1 — does NOT block Three.js which is at z:0 */}
            <div aria-hidden="true" style={{
              position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none',
              background:
                'radial-gradient(ellipse 55% 50% at 12% 18%, rgba(30,64,175,0.10) 0%, transparent 58%),' +
                'radial-gradient(ellipse 40% 40% at 88% 78%, rgba(6,182,212,0.07) 0%, transparent 55%)'
            }} />

            <div className="dashboard">

              {/* Hidden file input — ALWAYS mounted so ref is never null */}
              <input
                type="file"
                style={{ display: 'none' }}
                ref={fileInputRef}
                onChange={handleFileChange}
                id="file-upload-input"
                accept=".xlsx,.xls,.csv"
                aria-label="Upload Excel or CSV file"
              />

              {/* Header */}
              <header className="header" ref={headerRef}>
                <div className="header-brand">
                  {/* Back to landing */}
                  <motion.button
                    onClick={() => {
                      setView('landing')
                      setStatus('idle'); setSessionId(null)
                      setLogs([]); setRecords([])
                      setKpis({ total_records: 0, sap_posted: 0, sap_failed: 0 })
                    }}
                    whileHover={{ scale: 1.08, x: -2 }}
                    whileTap={{ scale: 0.93 }}
                    title="Back to landing"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                      background: 'rgba(59,130,246,0.08)',
                      border: '1px solid rgba(59,130,246,0.22)',
                      color: 'var(--neon-blue)', cursor: 'pointer', marginRight: 8,
                      transition: 'background 0.2s, border-color 0.2s',
                    }}
                  >
                    <ChevronLeft size={16} />
                  </motion.button>
                  <div className="header-logo">
                    <div className="header-logo-ring" />
                    <div className="header-logo-inner" />
                  </div>
                  <div className="header-text">
                    <h1>Autonomous Bulk Upload</h1>
                    <div className="header-subtitle">Enterprise PLM · AI-Powered Validation</div>
                  </div>
                </div>
                <div className="header-actions">
                  <AnimatePresence>
                    {status !== 'idle' && (
                      <motion.div className="session-badge"
                        initial={{ opacity: 0, scale: 0.82 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.82 }}
                        transition={{ type: 'spring', damping: 18, stiffness: 280 }}
                      >
                        <span className="session-dot" />{status === 'uploading' ? 'Uploading...' : 'Session Active'}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {status === 'idle' && (
                    <motion.button className="btn-primary" onClick={handleUploadClick}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }} aria-label="Upload Excel or CSV file"
                    >
                      <Upload size={15} />Upload Excel / CSV
                    </motion.button>
                  )}
                </div>
              </header>

              {/* KPI Grid */}
              <div className="kpi-grid" ref={kpiRef}>
                {KPI_CARDS.map((k) => (
                  <motion.div key={k.label} className="glass-panel kpi-card"
                    whileHover={{ y: -5, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } }}
                  >
                    <div className="kpi-header">
                      <div className="kpi-label">{k.label}</div>
                      <div className={`kpi-icon-badge ${k.iconClass}`}>{k.icon}</div>
                    </div>
                    <div className={`kpi-value ${k.valueClass}`}><AnimatedNumber value={k.value} /></div>
                    <div className="kpi-trend">{k.trend}</div>
                    <div className="kpi-glow-bar" style={{ background: k.glow }} />
                  </motion.div>
                ))}
              </div>

              {/* ── Pipeline Tracker (shown while processing) ── */}
              <AnimatePresence>
                {status !== 'idle' && (
                  <PipelineTracker key="pipeline" logs={logs} status={status} />
                )}
              </AnimatePresence>

              {/* Main Panel */}
              <div className="glass-panel main-panel" ref={mainRef}>

                {/* Pill Tabs */}
                <div className="tabs-wrapper" ref={tabsWrapRef} role="tablist">
                  <motion.div className="tab-slider" animate={sliderStyle}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }} />
                  {TABS.map(t => (
                    <button key={t.id}
                      ref={el => { tabsRef.current[t.id] = el }}
                      role="tab" aria-selected={activeTab === t.id}
                      id={`tab-${t.id}`}
                      className={`tab ${activeTab === t.id ? 'active' : ''}`}
                      onClick={() => setActiveTab(t.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      {t.icon}{t.label}
                      {t.badge !== null && (
                        <span className={`tab-badge ${t.badge === 0 ? 'zero' : ''}`}>{t.badge}</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <AnimatePresence mode="wait">
                  <motion.div key={activeTab} role="tabpanel" aria-labelledby={`tab-${activeTab}`}
                    variants={tabAnim} initial="hidden" animate="visible" exit="exit" className="tab-content"
                  >
                    {/* ── LOGS ──────────────────── */}
                    {activeTab === 'logs' && (
                      <div>
                        {/* Upload error banner */}
                        {uploadError && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '12px 16px', marginBottom: 16,
                              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                              borderRadius: 10, color: '#ef4444', fontSize: '0.85rem'
                            }}
                          >
                            <AlertCircle size={16} />
                            {uploadError}
                            <button
                              onClick={() => setUploadError(null)}
                              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem', padding: 0 }}
                            >×</button>
                          </motion.div>
                        )}

                        {status === 'idle' && (
                          <motion.div className="upload-area" onClick={handleUploadClick}
                            role="button" tabIndex={0} aria-label="Click to upload PLM extract"
                            onKeyDown={e => e.key === 'Enter' && handleUploadClick()}
                            style={{ cursor: 'pointer' }}
                          >
                            <motion.div className="upload-icon-ring"
                              animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.04, 1] }}
                              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                            ><Upload size={30} /></motion.div>
                            <div>
                              <div className="upload-title">Drop PLM Extract Here</div>
                              <div className="upload-subtitle">Click or drag & drop to start autonomous validation</div>
                            </div>
                            <div className="upload-hint">Supports .xlsx · .xls · .csv</div>
                          </motion.div>
                        )}
                        <div className="logs-container" aria-live="polite" aria-label="Execution logs">
                          <AnimatePresence initial={false}>
                            {logs.map((log, i) => (
                              <motion.div key={`${log.timestamp}-${i}`} className={`log-entry ${log.level}`}
                                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                              >
                                <div className="log-time">{log.timestamp}</div>
                                <div className="log-agent">[{log.agent}]</div>
                                <div className="log-msg">
                                  {log.message}
                                  {log.confidence != null && (
                                    <span style={{ color: 'var(--text-lo)', marginLeft: 8, fontSize: '0.74rem' }}>
                                      · Conf: {log.confidence}%
                                    </span>
                                  )}
                                </div>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                          <div ref={logsEndRef} />
                        </div>
                      </div>
                    )}

                    {/* ── FORMAT ERRORS ─────────── */}
                    {activeTab === 'format' && (
                      <div>
                        <div className="section-header">
                          <span className="section-title-sm">Format Errors</span>
                          {formatErrors.length > 0 && (
                            <motion.button className="btn-fix-all" onClick={() => fixAllAI('format')}
                              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                              style={{ cursor: 'pointer' }} aria-label="Auto-fix format errors"
                            ><Zap size={13} />Auto-Fix Confident Errors</motion.button>
                          )}
                        </div>
                        {formatErrors.length === 0 ? (
                          <motion.div className="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <CheckCircle size={20} />No format errors found — all fields are clean.
                          </motion.div>
                        ) : (
                          <div className="error-table-wrapper">
                            <table className="error-table" aria-label="Format errors table">
                              <thead><tr><th>Record ID</th><th>Material</th><th>Error Field</th><th>Issue Description</th><th>AI Suggestion</th><th>Action</th></tr></thead>
                              <tbody>
                                {formatErrors.map((r, i) => (
                                  <motion.tr key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.3 }}>
                                    <td><span className="cell-id">{r.id}</span></td>
                                    <td>{r.data.Material}</td>
                                    <td><span className="cell-field cyan">{r.error_field}</span></td>
                                    <td style={{ color: 'var(--text-md)', fontSize: '0.8rem' }}>{r.error_msg}</td>
                                    <td style={{ color: 'var(--text-md)', fontSize: '0.8rem' }}>{r.ai_suggestion || '—'}</td>
                                    <td>
                                      {r.ai_fixable
                                        ? <span className="badge-ai-ready"><ShieldCheck size={11} />AI Ready</span>
                                        : <button className="btn-danger-outline" style={{ cursor: 'pointer' }} onClick={() => openManualFix(r)}>Manual Fix</button>
                                      }
                                    </td>
                                  </motion.tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── VALIDATION ERRORS ─────── */}
                    {activeTab === 'validation' && (
                      <div>
                        <div className="section-header">
                          <span className="section-title-sm">Business Validation Errors</span>
                          {validationErrors.length > 0 && (
                            <motion.button className="btn-fix-all" onClick={() => fixAllAI('validation')}
                              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                              style={{ cursor: 'pointer' }} aria-label="Auto-fix validation errors"
                            ><Zap size={13} />Auto-Fix Confident Errors</motion.button>
                          )}
                        </div>
                        {validationErrors.length === 0 ? (
                          <motion.div className="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <CheckCircle size={20} />No validation errors — all business rules satisfied.
                          </motion.div>
                        ) : (
                          <div className="error-table-wrapper">
                            <table className="error-table" aria-label="Validation errors table">
                              <thead><tr><th>Record ID</th><th>Material</th><th>Error Field</th><th>Business Rule Failure</th><th>AI Suggestion</th><th>Action</th></tr></thead>
                              <tbody>
                                {validationErrors.map((r, i) => (
                                  <motion.tr key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.3 }}>
                                    <td><span className="cell-id">{r.id}</span></td>
                                    <td>{r.data.Material}</td>
                                    <td><span className="cell-field amber">{r.error_field}</span></td>
                                    <td style={{ color: 'var(--text-md)', fontSize: '0.8rem' }}>{r.error_msg}</td>
                                    <td style={{ color: 'var(--text-md)', fontSize: '0.8rem' }}>{r.ai_suggestion || '—'}</td>
                                    <td>
                                      {r.ai_fixable
                                        ? <span className="badge-ai-ready"><ShieldCheck size={11} />AI Ready</span>
                                        : <button className="btn-danger-outline" style={{ cursor: 'pointer' }} onClick={() => openManualFix(r)}>Manual Fix</button>
                                      }
                                    </td>
                                  </motion.tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── ANALYSIS ──────────────── */}
                    {activeTab === 'analysis' && (
                      <div>
                        <div className="analysis-header">
                          <TrendingUp size={18} color="var(--neon-blue)" />
                          <div>
                            <div className="analysis-title">Real-Time Processing Analytics</div>
                            <div className="analysis-subtitle">Live record state tracking & resolution metrics</div>
                          </div>
                        </div>
                        <div className="chart-grid">
                          <motion.div className="chart-card" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05, duration: 0.4 }}>
                            <div className="chart-title">Current Record States</div>
                            <ResponsiveContainer width="100%" height={210}>
                              <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={4} dataKey="value" strokeWidth={0}>
                                  {pieData.map((entry, idx) => <Cell key={`c-${idx}`} fill={entry.color} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                              </PieChart>
                            </ResponsiveContainer>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 4 }}>
                              {pieData.map(d => (
                                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: 'var(--text-md)' }}>
                                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: d.color, boxShadow: `0 0 6px ${d.color}` }} />{d.name}
                                </div>
                              ))}
                            </div>
                          </motion.div>

                          <motion.div className="chart-card" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, duration: 0.4 }}>
                            <div className="chart-title">Fix Resolution Impact</div>
                            <ResponsiveContainer width="100%" height={210}>
                              <BarChart data={barData} barSize={34}>
                                <XAxis dataKey="name" stroke="var(--text-lo)" tick={{ fontSize: 10, fontFamily: 'Fira Code', fill: 'var(--text-md)' }} axisLine={false} tickLine={false} />
                                <YAxis stroke="var(--text-lo)" tick={{ fontSize: 10, fontFamily: 'Fira Code', fill: 'var(--text-lo)' }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                  {barData.map((entry, idx) => <Cell key={`c-${idx}`} fill={entry.fill} />)}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </motion.div>

                          <motion.div className="chart-card span-full" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }}>
                            <div className="chart-title">SAP Posting Metrics</div>
                            <div className="sap-metrics-grid">
                              <div className="sap-metric">
                                <div className="sap-metric-label">
                                  <CheckCircle size={13} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle', color: 'var(--success)' }} />
                                  Total Ready / Posted
                                </div>
                                <div className="sap-metric-value success"><AnimatedNumber value={kpis.sap_posted} /></div>
                              </div>
                              <div className="sap-metric">
                                <div className="sap-metric-label">
                                  <ServerCrash size={13} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle', color: 'var(--error)' }} />
                                  SAP Rejections
                                </div>
                                <div className="sap-metric-value error"><AnimatedNumber value={kpis.sap_failed} /></div>
                              </div>
                            </div>
                          </motion.div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Manual Fix Modal ──────────────── */}
      <AnimatePresence>
        {modalOpen && currentEditRecord && (
          <motion.div className="modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}
            aria-modal="true" role="dialog" aria-labelledby="modal-title"
          >
            <motion.div className="modal-content"
              initial={{ scale: 0.90, opacity: 0, y: 28 }}
              animate={{ scale: 1,    opacity: 1, y: 0 }}
              exit={{ scale: 0.90,    opacity: 0, y: 28 }}
              transition={{ type: 'spring', damping: 22, stiffness: 320 }}
            >
              <div className="modal-header">
                <div className="modal-title" id="modal-title">Manual Correction</div>
                <div className="modal-meta">
                  Record <strong style={{ color: 'var(--neon-cyan)' }}>{currentEditRecord.id}</strong>
                  &nbsp;·&nbsp;{currentEditRecord.data.Material}
                </div>
              </div>
              <div className="modal-body">
                <div className="modal-error-box">
                  <AlertCircle size={17} style={{ color: 'var(--error)', flexShrink: 0, marginTop: 2 }} />
                  <span>{currentEditRecord.error_msg}</span>
                </div>
                <div className="modal-form-group">
                  <label htmlFor="edit-field">
                    Editing Field:&nbsp;<span className="field-name">{currentEditRecord.error_field}</span>
                  </label>
                  {masterDataOptions ? (
                    <select id="edit-field" value={editValue} onChange={e => setEditValue(e.target.value)}>
                      {masterDataOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <input id="edit-field" type="text" value={editValue}
                      onChange={e => setEditValue(e.target.value)} autoFocus />
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-cancel" style={{ cursor: 'pointer' }} onClick={() => setModalOpen(false)}>Cancel</button>
                <motion.button className="btn-save" style={{ cursor: 'pointer' }} onClick={submitManualFix}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Save size={14} style={{ marginRight: 5, verticalAlign: 'middle' }} />Save & Validate
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
