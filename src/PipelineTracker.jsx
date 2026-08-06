import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileX, ShieldCheck, Zap, Database, CheckCircle, AlertCircle } from 'lucide-react'

/* ── Pipeline step definitions ───────────────────────────
   `agents` maps backend log agent names → this step
   ─────────────────────────────────────────────────────── */
const STEPS = [
  {
    id: 'upload',
    label: 'File Upload',
    sub: 'Parse & extract records',
    Icon: Upload,
    agents: ['UploadAgent'],
    color: '#3b82f6',
  },
  {
    id: 'format',
    label: 'Format Check',
    sub: 'Validate field formats',
    Icon: FileX,
    agents: ['FormatAgent'],
    color: '#06b6d4',
  },
  {
    id: 'validation',
    label: 'Business Rules',
    sub: 'Apply SAP constraints',
    Icon: ShieldCheck,
    agents: ['ValidationAgent'],
    color: '#8b5cf6',
  },
  {
    id: 'autofix',
    label: 'AI Auto-Fix',
    sub: 'Autonomous correction',
    Icon: Zap,
    agents: ['Orchestrator'],
    color: '#f59e0b',
  },
  {
    id: 'sap',
    label: 'SAP Posting',
    sub: 'Live integration',
    Icon: Database,
    agents: ['SAPAgent'],
    color: '#22c55e',
  },
]

/* ── Derive per-step state from log history ─────────────
   idle | active | done | error
   ─────────────────────────────────────────────────────── */
function deriveStepStates(logs) {
  const agentsSeen    = new Set(logs.map(l => l.agent))
  const errorAgents   = new Set(logs.filter(l => l.level === 'error').map(l => l.agent))
  const successAgents = new Set(logs.filter(l => l.level === 'success').map(l => l.agent))

  return STEPS.map((step, i) => {
    const seen       = step.agents.some(a => agentsSeen.has(a))
    const hasError   = step.agents.some(a => errorAgents.has(a))
    const hasSuccess = step.agents.some(a => successAgents.has(a))
    if (!seen) return 'idle'
    if (hasError) return 'error'
    // Done if: a later step has started (steps 1-4)
    // OR this step emitted a success-level log (handles last step + clean runs)
    const laterStarted = STEPS.slice(i + 1).some(s =>
      s.agents.some(a => agentsSeen.has(a))
    )
    return (laterStarted || hasSuccess) ? 'done' : 'active'
  })
}

/* ── Spinning loader ring (CSS-free, pure SVG) ────────── */
const SpinRing = ({ color }) => (
  <motion.svg
    width="42" height="42" viewBox="0 0 42 42"
    animate={{ rotate: 360 }}
    transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
    style={{ position: 'absolute', inset: 0 }}
  >
    <circle
      cx="21" cy="21" r="18"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeDasharray="60 50"
      strokeLinecap="round"
    />
  </motion.svg>
)

/* ── Single step node ─────────────────────────────────── */
const StepNode = ({ step, state, idx, total }) => {
  const { Icon, color, label, sub } = step

  const isActive = state === 'active'
  const isDone   = state === 'done'
  const isError  = state === 'error'
  const isIdle   = state === 'idle'

  const ringColor = isError ? '#ef4444' : isDone ? '#22c55e' : isActive ? color : 'rgba(59,130,246,0.2)'
  const bgColor   = isError ? 'rgba(239,68,68,0.1)'  : isDone ? 'rgba(34,197,94,0.1)'  : isActive ? `${color}18` : 'rgba(59,130,246,0.04)'
  const textColor = isError ? '#ef4444' : isDone ? '#22c55e' : isActive ? color : 'var(--text-lo)'
  const statusLabel = isError ? 'Error' : isDone ? 'Done' : isActive ? 'Processing…' : 'Waiting'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, minWidth: 90, flex: 1 }}>
      {/* ── Node circle ── */}
      <div style={{ position: 'relative', width: 42, height: 42, flexShrink: 0 }}>
        {/* Pulsing glow ring for active */}
        {isActive && (
          <motion.div
            style={{
              position: 'absolute', inset: -6,
              borderRadius: '50%',
              border: `1px solid ${color}`,
              opacity: 0,
            }}
            animate={{ opacity: [0, 0.6, 0], scale: [0.85, 1.4, 0.85] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* Circle background */}
        <motion.div
          style={{
            width: 42, height: 42, borderRadius: '50%',
            background: bgColor,
            border: `1.5px solid ${ringColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
            boxShadow: (isActive || isDone || isError) ? `0 0 18px ${ringColor}55` : 'none',
          }}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: idx * 0.08, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
        >
          {/* Spinning indicator when active */}
          {isActive && <SpinRing color={color} />}

          {/* Icon */}
          <AnimatePresence mode="wait">
            {isDone ? (
              <motion.div key="check"
                initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 14, stiffness: 280 }}
              >
                <CheckCircle size={18} color="#22c55e" />
              </motion.div>
            ) : isError ? (
              <motion.div key="error"
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 14, stiffness: 280 }}
              >
                <AlertCircle size={18} color="#ef4444" />
              </motion.div>
            ) : (
              <motion.div key="icon">
                <Icon size={18} color={isIdle ? 'var(--text-lo)' : color} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ── Labels ── */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 600,
          color: isIdle ? 'var(--text-lo)' : 'var(--text-hi)',
          marginBottom: 2, whiteSpace: 'nowrap',
        }}>{label}</div>

        <div style={{ fontSize: '0.62rem', color: 'var(--text-lo)', marginBottom: 4, whiteSpace: 'nowrap' }}>{sub}</div>

        {/* Status chip */}
        <motion.div
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.08 + 0.2, duration: 0.35 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 8px', borderRadius: 99,
            fontSize: '0.6rem', fontWeight: 600, fontFamily: 'var(--font-mono)',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: textColor,
            background: isIdle ? 'transparent' : `${ringColor}18`,
            border: `1px solid ${isIdle ? 'rgba(59,130,246,0.1)' : `${ringColor}40`}`,
          }}
        >
          {isActive && (
            <motion.span
              style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block' }}
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
          {statusLabel}
        </motion.div>
      </div>
    </div>
  )
}

/* ── Connecting line between steps ───────────────────── */
const Connector = ({ fromState, toState }) => {
  const filled = fromState === 'done'
  const halfFilled = fromState === 'active'

  return (
    <div style={{
      flex: 1, height: 2,
      background: 'rgba(59,130,246,0.1)',
      borderRadius: 1, position: 'relative',
      overflow: 'hidden', marginBottom: 52, flexShrink: 1, minWidth: 16,
    }}>
      <motion.div
        style={{
          position: 'absolute', top: 0, left: 0, height: '100%',
          background: 'linear-gradient(90deg, #22c55e, #06b6d4)',
          borderRadius: 1,
        }}
        initial={{ width: '0%' }}
        animate={{ width: filled ? '100%' : halfFilled ? '55%' : '0%' }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  )
}

/* ── Main exported component ─────────────────────────── */
export default function PipelineTracker({ logs, status }) {
  const stepStates = useMemo(() => deriveStepStates(logs), [logs])

  const doneCount   = stepStates.filter(s => s === 'done').length
  const activeStep  = STEPS.find((_, i) => stepStates[i] === 'active')
  const allDone     = stepStates.every(s => s === 'done')
  const hasError    = stepStates.some(s => s === 'error')

  return (
    <motion.div
      className="pipeline-tracker"
      initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* ── Header bar ── */}
      <div className="pipeline-header">
        <div className="pipeline-header-left">
          {/* Status indicator */}
          <motion.div
            className="pipeline-status-dot"
            style={{
              background: hasError ? '#ef4444' : allDone ? '#22c55e' : '#06b6d4',
              boxShadow: `0 0 10px ${hasError ? '#ef4444' : allDone ? '#22c55e' : '#06b6d4'}`,
            }}
            animate={!allDone && !hasError ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
            transition={{ duration: 1.2, repeat: (!allDone && !hasError) ? Infinity : 0 }}
          />
          <span className="pipeline-title">AI Pipeline</span>
          {activeStep && !allDone && !hasError && (
            <motion.span
              key={activeStep.id}
              className="pipeline-active-label"
              initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
            >
              · {activeStep.label}
            </motion.span>
          )}
          {allDone && <span className="pipeline-active-label" style={{ color: '#22c55e' }}>· Complete</span>}
          {hasError && <span className="pipeline-active-label" style={{ color: '#ef4444' }}>· Error detected</span>}
        </div>

        <div className="pipeline-progress-text">
          <span style={{ color: 'var(--neon-cyan)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700 }}>
            {doneCount}
          </span>
          <span style={{ color: 'var(--text-lo)', fontSize: '0.72rem' }}>/{STEPS.length} steps</span>
        </div>
      </div>

      {/* ── Step row ── */}
      <div className="pipeline-steps">
        {STEPS.map((step, i) => (
          <div key={step.id} style={{ display: 'contents' }}>
            <StepNode step={step} state={stepStates[i]} idx={i} total={STEPS.length} />
            {i < STEPS.length - 1 && (
              <Connector fromState={stepStates[i]} toState={stepStates[i + 1]} />
            )}
          </div>
        ))}
      </div>
    </motion.div>
  )
}
