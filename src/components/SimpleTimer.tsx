// src/components/SimpleTimer.tsx
import { useEffect, useRef, useState } from 'react'
import { SETTINGS_CHANGED_EVENT } from '../lib/settingsEvents'

type AppSettings = { focusMinutes: number }

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

  // Timer internals
  const endAtRef = useRef<number | null>(null)
  const timerIntervalRef = useRef<number | null>(null)

  // Refs for tray updates (avoid stale closures)
  const remainingMsRef = useRef<number>(remainingMs)
  const isRunningRef = useRef<boolean>(isRunning)
  const lastSentSecRef = useRef<number | null>(null)

  const durationMs = focusMinutes * 60_000

  // Keep refs in sync
  useEffect(() => {
    remainingMsRef.current = remainingMs
  }, [remainingMs])

  useEffect(() => {
    isRunningRef.current = isRunning
  }, [isRunning])

  const stopTicking = () => {
    if (timerIntervalRef.current != null) window.clearInterval(timerIntervalRef.current)
    timerIntervalRef.current = null
  }

  const computeRemainingMs = () => {
    if (endAtRef.current == null) return remainingMsRef.current
    return Math.max(0, endAtRef.current - Date.now())
  }

  const start = () => {
    if (isRunningRef.current) return

    const now = Date.now()
    endAtRef.current = now + computeRemainingMs()
    setIsRunning(true)

    stopTicking()
    timerIntervalRef.current = window.setInterval(() => {
      const left = computeRemainingMs()
      setRemainingMs(left)

      if (left <= 0) {
        endAtRef.current = null
        stopTicking()
        setIsRunning(false)
      }
    }, 200)
  }

  const pause = () => {
    if (!isRunningRef.current) return
    const left = computeRemainingMs()

    stopTicking()
    endAtRef.current = null

    setRemainingMs(left)
    setIsRunning(false)
  }

  const reset = () => {
    stopTicking()
    endAtRef.current = null
    setIsRunning(false)
    setRemainingMs(durationMs)
  }

  // Initial load from settings store
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const s = await window.settings?.getAll?.()
        const mins = Math.max(1, Number(s?.focusMinutes ?? DEFAULT_FOCUS_MINUTES))
        if (!cancelled) {
          setFocusMinutes(mins)
          setRemainingMs(mins * 60_000)
        }
      } catch {
        // ignore
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  // Refresh timer when settings change (stop + reset to new duration)
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<AppSettings>
      const mins = Math.max(1, Number(ce.detail?.focusMinutes ?? DEFAULT_FOCUS_MINUTES))

      stopTicking()
      endAtRef.current = null
      lastSentSecRef.current = null

      setIsRunning(false)
      setFocusMinutes(mins)
      setRemainingMs(mins * 60_000)
    }

    window.addEventListener(SETTINGS_CHANGED_EVENT, handler)
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ✅ Tray + window title updates (robust, no stale state, no spam)
  useEffect(() => {
    const id = window.setInterval(() => {
      const ms = remainingMsRef.current
      const running = isRunningRef.current
      const remainingSec = Math.ceil(ms / 1000)

      if (lastSentSecRef.current === remainingSec) return
      lastSentSecRef.current = remainingSec

      document.title = `${formatMMSS(remainingSec)} • Pomodoro`
      window.timer?.tick?.(remainingSec, running)
    }, 250)

    return () => window.clearInterval(id)
  }, [])

  // Cleanup
  useEffect(() => {
    return () => stopTicking()
  }, [])

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
