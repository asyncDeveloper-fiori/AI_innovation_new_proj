import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { gsap } from 'gsap'
import { ArrowRight, Cpu, ShieldCheck, Zap, Database, Globe, ChevronDown } from 'lucide-react'
import HeroScene from './HeroScene'

/* ── Split text into animated character spans ── */
const SplitText = ({ text, className, delay = 0, staggerDelay = 0.03 }) => (
  <span className={className} aria-label={text} style={{ display: 'inline-block' }}>
    {text.split('').map((char, i) => (
      <motion.span
        key={i}
        initial={{ y: '110%', opacity: 0, rotateX: -90 }}
        animate={{ y: '0%', opacity: 1, rotateX: 0 }}
        transition={{
          delay: delay + i * staggerDelay,
          duration: 0.55,
          ease: [0.16, 1, 0.3, 1],
        }}
        style={{ display: 'inline-block', transformOrigin: 'bottom center', perspective: '400px' }}
      >
        {char === ' ' ? '\u00A0' : char}
      </motion.span>
    ))}
  </span>
)

/* ── Magnetic button that follows cursor ── */
const MagneticBtn = ({ children, onClick, className }) => {
  const btnRef = useRef(null)

  const handleMove = (e) => {
    const el  = btnRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const dx   = e.clientX - (rect.left + rect.width  / 2)
    const dy   = e.clientY - (rect.top  + rect.height / 2)
    gsap.to(el, { x: dx * 0.38, y: dy * 0.38, duration: 0.5, ease: 'power2.out' })
  }

  const handleLeave = () => {
    gsap.to(btnRef.current, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.45)' })
  }

  return (
    <button
      ref={btnRef}
      className={className}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      {children}
    </button>
  )
}

/* ── Animated counter ── */
const Counter = ({ target, suffix = '' }) => {
  const [val, setVal] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      obs.disconnect()
      const t0  = performance.now()
      const dur = 1400
      const tick = (now) => {
        const p = Math.min((now - t0) / dur, 1)
        const e = 1 - Math.pow(1 - p, 3)
        setVal(Math.round(target * e))
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, { threshold: 0.5 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [target])
  return <span ref={ref}>{val}{suffix}</span>
}

/* ── Custom cursor dot ── */
const Cursor = () => {
  const dotRef   = useRef(null)
  const trailRef = useRef(null)

  useEffect(() => {
    const dot   = dotRef.current
    const trail = trailRef.current
    if (!dot || !trail) return

    const move = (e) => {
      gsap.to(dot,   { x: e.clientX, y: e.clientY, duration: 0.08, ease: 'none' })
      gsap.to(trail, { x: e.clientX, y: e.clientY, duration: 0.35, ease: 'power2.out' })
    }

    const expand = () => {
      gsap.to(dot,   { scale: 2.5, opacity: 0.5, duration: 0.3 })
      gsap.to(trail, { scale: 1.6, opacity: 0.3, duration: 0.3 })
    }
    const shrink = () => {
      gsap.to(dot,   { scale: 1, opacity: 1, duration: 0.3 })
      gsap.to(trail, { scale: 1, opacity: 0.5, duration: 0.3 })
    }

    window.addEventListener('mousemove', move)
    document.querySelectorAll('a,button,[role="button"]').forEach(el => {
      el.addEventListener('mouseenter', expand)
      el.addEventListener('mouseleave', shrink)
    })

    return () => window.removeEventListener('mousemove', move)
  }, [])

  return (
    <>
      <div ref={dotRef}   className="cursor-dot" />
      <div ref={trailRef} className="cursor-trail" />
    </>
  )
}

const FEATURES = [
  { icon: <Cpu size={18} />,        label: 'AI Validation Engine',   desc: 'Multi-agent LLM pipeline validates 100+ business rules in real-time' },
  { icon: <ShieldCheck size={18} />, label: 'Zero-Touch Fixes',      desc: 'Autonomous correction of format & master-data errors with confidence scoring' },
  { icon: <Zap size={18} />,        label: 'SAP Direct Post',        desc: 'Validated records stream directly into SAP with full audit trail' },
  { icon: <Database size={18} />,   label: 'PLM-Native Schema',      desc: 'Pre-built extractors for ENOVIA, Teamcenter, Windchill, and Arena PLM' },
  { icon: <Globe size={18} />,      label: 'Live Dashboard',         desc: 'Real-time SSE streaming keeps every stakeholder in sync, zero refresh' },
  { icon: <ArrowRight size={18} />, label: 'Traceable Lineage',      desc: 'Every AI decision is logged, explainable, and exportable for audit' },
]

const STATS = [
  { value: 99,  suffix: '%',  label: 'Validation Accuracy' },
  { value: 10,  suffix: 'x',  label: 'Faster Than Manual' },
  { value: 500, suffix: 'K+', label: 'Records Processed' },
]

export default function LandingPage({ onEnter }) {
  const featRef  = useRef(null)
  const [ready,  setReady]  = useState(false)

  // Stagger in feature cards on mount
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 200)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!ready || !featRef.current) return
    const cards = featRef.current.querySelectorAll('.feat-card')
    gsap.fromTo(cards,
      { opacity: 0, y: 40, filter: 'blur(6px)' },
      { opacity: 1, y: 0,  filter: 'blur(0px)', stagger: 0.1, duration: 0.7, ease: 'power3.out', delay: 0.2 }
    )
  }, [ready])

  return (
    <motion.div
      className="landing-root"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.96, filter: 'blur(12px)', transition: { duration: 0.55, ease: [0.4, 0, 1, 1] } }}
    >
      <Cursor />

      {/* ── Hero ─────────────────────────────── */}
      <section className="hero-section">
        {/* Three.js scene — full coverage */}
        <HeroScene />

        {/* Gradient vignette so text is legible */}
        <div className="hero-vignette" aria-hidden="true" />

        {/* Content */}
        <div className="hero-content">
          {/* Eyebrow */}
          <motion.div
            className="hero-eyebrow"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="eyebrow-dot" />
            Enterprise PLM · AI-Powered
          </motion.div>

          {/* Headline — split char animation */}
          <h1 className="hero-h1" style={{ overflow: 'hidden' }}>
            <div className="h1-line" style={{ overflow: 'hidden', display: 'block' }}>
              <SplitText text="AUTONOMOUS" className="h1-word gradient-text" delay={0.35} staggerDelay={0.035} />
            </div>
            <div className="h1-line" style={{ overflow: 'hidden', display: 'block' }}>
              <SplitText text="PLM CORE" className="h1-word h1-outline" delay={0.7} staggerDelay={0.04} />
            </div>
          </h1>

          {/* Subheadline */}
          <motion.p
            className="hero-sub"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            Next-generation AI pipeline that validates, auto-corrects, and posts
            PLM bulk extracts directly into SAP — <em>without human intervention.</em>
          </motion.p>

          {/* CTA row */}
          <motion.div
            className="hero-cta-row"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            <MagneticBtn className="cta-primary" onClick={onEnter}>
              <span>Enter Dashboard</span>
              <ArrowRight size={16} />
            </MagneticBtn>

            <div className="cta-hint">
              <span className="hint-dot" />
              Click any 3D object to interact
            </div>
          </motion.div>

          {/* Stats row */}
          <motion.div
            className="hero-stats"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            {STATS.map((s, i) => (
              <div key={i} className="stat-item">
                <div className="stat-value">
                  <Counter target={s.value} suffix={s.suffix} />
                </div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="scroll-indicator"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 0.5 }}
        >
          <ChevronDown size={18} />
          <span>Scroll to explore</span>
        </motion.div>
      </section>

      {/* ── Features Grid ─────────────────────── */}
      <section className="features-section">
        <div className="features-inner">
          <motion.div
            className="section-eyebrow"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            Capabilities
          </motion.div>

          <motion.h2
            className="section-title"
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            Everything you need to ship PLM data at scale
          </motion.h2>

          <div className="feat-grid" ref={featRef}>
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                className="feat-card"
                whileHover={{ y: -6, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } }}
              >
                <div className="feat-icon">{f.icon}</div>
                <div className="feat-label">{f.label}</div>
                <div className="feat-desc">{f.desc}</div>
                <div className="feat-card-glow" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA banner ─────────────────── */}
      <section className="bottom-cta">
        <motion.div
          className="bottom-cta-inner"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="bottom-cta-glow" aria-hidden="true" />
          <h3 className="bottom-cta-title">Ready to automate your PLM pipeline?</h3>
          <p className="bottom-cta-sub">Upload your first extract and watch the AI work.</p>
          <MagneticBtn className="cta-primary" onClick={onEnter}>
            <span>Open Dashboard</span>
            <ArrowRight size={16} />
          </MagneticBtn>
        </motion.div>
      </section>
    </motion.div>
  )
}
