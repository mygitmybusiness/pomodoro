import { useEffect, useRef, useState } from 'react'
import { SETTINGS_CHANGED_EVENT } from '../lib/settingsEvents'

type AppSettings = {
  focusMinutes: number
}

const DEFAULT_FOCUS_MINUTES = 25

function formatMMSS(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

export function SimpleTimer() {
  const [focusMinutes, setFocusMinutes] = useState(DEFAULT_FOCUS_MINUTES)

  const [isRunning, setIsRunning] = useState(false)
  const [remainingMs, setRemainingMs] = useState(DEFAULT_FOCUS_MINUTES * 60_000)

  const lastSentRef = useRef<number | null>(null)

  // Update window title + tray (1Hz while running, and immediately on pause/reset)
  useEffect(() => {
    const send = () => {
      const remainingSec = Math.ceil(remainingMs / 1000)
      if (lastSentRef.current === remainingSec) return
      lastSentRef.current = remainingSec

      const status = isRunning ? '▶' : '⏸'

      const text = `${formatMMSS(remainingSec)} ${status} • Pomodoro`
      document.title = text
      
      window.timer?.tick?.(remainingSec, isRunning)
    }

    // Always send at least once when state changes
    send()

    // While running, keep updating once per second
    if (!isRunning) return

    const id = window.setInterval(send, 1000)
    return () => window.clearInterval(id)
  }, [isRunning, remainingMs])
  

  const endAtRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  const durationMs = focusMinutes * 60_000

  const stopLoop = () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
  }

  const startLoop = () => {
    const tick = () => {
      if (endAtRef.current == null) return
      const now = performance.now()
      const left = endAtRef.current - now

      if (left <= 0) {
        setRemainingMs(0)
        stopLoop()
        endAtRef.current = null
        setIsRunning(false)
        return
      }

      setRemainingMs(left)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  const start = () => {
    if (isRunning) return
    endAtRef.current = performance.now() + remainingMs
    setIsRunning(true)
    startLoop()
  }

  const pause = () => {
    if (!isRunning) return
    setIsRunning(false)
    stopLoop()
    const now = performance.now()
    const left = (endAtRef.current ?? now) - now
    setRemainingMs(Math.max(0, left))
    endAtRef.current = null
  }

  const reset = () => {
    setIsRunning(false)
    stopLoop()
    endAtRef.current = null
    setRemainingMs(durationMs)
  }

  // Initial load from settings store
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const s = await window.settings?.getAll?.()
        if (!cancelled && s?.focusMinutes) {
          const mins = Math.max(1, Number(s.focusMinutes))
          setFocusMinutes(mins)
          setRemainingMs(mins * 60_000)
        }
      } catch {
        // ignore, keep defaults
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Listen for settings changes and refresh timer immediately
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<AppSettings>
      const mins = Math.max(1, Number(ce.detail?.focusMinutes ?? DEFAULT_FOCUS_MINUTES))

      // Refresh to new settings:
      // - set new duration
      // - reset timer to full duration
      // - stop running
      setFocusMinutes(mins)
      setIsRunning(false)
      stopLoop()
      endAtRef.current = null
      setRemainingMs(mins * 60_000)
    }

    window.addEventListener(SETTINGS_CHANGED_EVENT, handler)
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cleanup
  useEffect(() => stopLoop, [])

  const remainingSec = Math.ceil(remainingMs / 1000)

  return (
    <div style={styles.card}>
      <div style={styles.kicker}>Focus Timer</div>

      <div style={styles.time}>{formatMMSS(remainingSec)}</div>

      <div style={styles.meta}>
        Duration: <b>{focusMinutes}</b> min • Status: <b>{isRunning ? 'Running' : 'Paused'}</b>
      </div>

      <div style={styles.actions}>
        {!isRunning ? (
          <button style={styles.primary} onClick={start}>
            Start
          </button>
        ) : (
          <button style={styles.primary} onClick={pause}>
            Pause
          </button>
        )}

        <button style={styles.secondary} onClick={reset}>
          Reset
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    width: 'min(420px, 100%)',
    background: '#111',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 16,
  },
  kicker: { fontSize: 12, opacity: 0.7, marginBottom: 10 },
  time: { fontSize: 56, fontWeight: 900, textAlign: 'center', letterSpacing: 1 },
  meta: { fontSize: 12, opacity: 0.75, textAlign: 'center', marginTop: 8 },
  actions: { display: 'flex', gap: 10, justifyContent: 'center', marginTop: 14 },
  primary: {
    background: '#fff',
    color: '#000',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: '10px 14px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  secondary: {
    background: 'transparent',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: 12,
    padding: '10px 14px',
    cursor: 'pointer',
  },
}
