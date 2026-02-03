import { useEffect, useId, useRef, useState } from 'react'
import type { AppSettings } from '../types/settings'
import { emitSettingsChanged } from '../lib/settingsEvents'

type Props = {
  open: boolean
  onClose: () => void
  onSaved?: (settings: AppSettings) => void
}

const DEFAULTS: AppSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  soundEnabled: true,
}

export function SettingsModal({ open, onClose, onSaved }: Props) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<AppSettings>(DEFAULTS)

  // Load settings when opened
  useEffect(() => {
    if (!open) return

    previouslyFocused.current = document.activeElement as HTMLElement | null
    setError(null)
    setDirty(false)

    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const s = await window.settings.getAll()
        if (!cancelled) setForm(s)
      } catch (e) {
        if (!cancelled) setError('Failed to load settings.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    // focus first focusable element inside
    queueMicrotask(() => {
      const el = dialogRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      el?.focus()
    })

    return () => {
      cancelled = true
    }
  }, [open])

  // Restore focus on close
  useEffect(() => {
    if (open) return
    previouslyFocused.current?.focus?.()
  }, [open])

  // Escape to close
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  // Basic focus trap (Tab cycling)
  const onKeyDownTrap = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return
    const root = dialogRef.current
    if (!root) return

    const focusables = Array.from(
      root.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-disabled'))

    if (focusables.length === 0) return

    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    const active = document.activeElement as HTMLElement | null

    if (e.shiftKey) {
      if (!active || active === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (active === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  const setNumber =
    (key: keyof AppSettings) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value === '' ? '' : Number(e.target.value)
      setDirty(true)
      setForm((s) => ({ ...s, [key]: value === '' ? (s[key] as number) : value }))
    }

  const setBool =
    (key: keyof AppSettings) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDirty(true)
      setForm((s) => ({ ...s, [key]: e.target.checked }))
    }

  const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

  const validate = (s: AppSettings) => {
    // keep it simple; adjust limits as needed
    return {
      ...s,
      focusMinutes: clamp(s.focusMinutes, 1, 240),
      shortBreakMinutes: clamp(s.shortBreakMinutes, 1, 60),
      longBreakMinutes: clamp(s.longBreakMinutes, 1, 120),
      longBreakEvery: clamp(s.longBreakEvery, 1, 12),
    }
  }

  const save = async () => {
    try {
      setSaving(true)
      setError(null)
      const next = validate(form)
      const saved = await window.settings.setAll(next)
      emitSettingsChanged(saved)
      setForm(saved)
      setDirty(false)
      onSaved?.(saved)
      onClose()
    } catch (e) {
      setError('Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  const discardAndClose = () => {
    onClose()
  }

  if (!open) return null

  return (
    <div
      role="presentation"
      onMouseDown={(e) => {
        // click outside closes (only if clicking overlay itself)
        if (e.target === e.currentTarget) onClose()
      }}
      style={styles.overlay}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDownTrap}
        style={styles.dialog}
      >
        <div style={styles.header}>
          <h2 id={titleId} style={styles.title}>
            Settings
          </h2>

          <button type="button" onClick={onClose} style={styles.iconBtn} aria-label="Close settings">
            ✕
          </button>
        </div>

        <div style={styles.body}>
          {loading ? (
            <p style={styles.muted}>Loading…</p>
          ) : (
            <>
              {error && (
                <div role="alert" style={styles.error}>
                  {error}
                </div>
              )}

              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>Timer</h3>

                <Field label="Focus minutes">
                  <input
                    type="number"
                    min={1}
                    max={240}
                    value={form.focusMinutes}
                    onChange={setNumber('focusMinutes')}
                    style={styles.input}
                  />
                </Field>

                <Field label="Short break minutes">
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={form.shortBreakMinutes}
                    onChange={setNumber('shortBreakMinutes')}
                    style={styles.input}
                  />
                </Field>

                <Field label="Long break minutes">
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={form.longBreakMinutes}
                    onChange={setNumber('longBreakMinutes')}
                    style={styles.input}
                  />
                </Field>

                <Field label="Long break every (pomodoros)">
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={form.longBreakEvery}
                    onChange={setNumber('longBreakEvery')}
                    style={styles.input}
                  />
                </Field>
              </section>

              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>Behavior</h3>

                <Checkbox
                  label="Auto-start breaks"
                  checked={form.autoStartBreaks}
                  onChange={setBool('autoStartBreaks')}
                />
                <Checkbox
                  label="Auto-start pomodoros"
                  checked={form.autoStartPomodoros}
                  onChange={setBool('autoStartPomodoros')}
                />
              </section>

              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>Sound</h3>

                <Checkbox
                  label="Enable sounds"
                  checked={form.soundEnabled}
                  onChange={setBool('soundEnabled')}
                />
              </section>
            </>
          )}
        </div>

        <div style={styles.footer}>
          <button type="button" onClick={discardAndClose} style={styles.secondaryBtn}>
            Cancel
          </button>

          <button
            type="button"
            onClick={save}
            style={{
              ...styles.primaryBtn,
              opacity: saving ? 0.7 : 1,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
            disabled={saving || loading || !dirty}
            aria-disabled={saving || loading || !dirty}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      {children}
    </label>
  )
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <label style={styles.checkboxRow}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'grid',
    placeItems: 'center',
    padding: 16,
    zIndex: 9999,
  },
  dialog: {
    width: 'min(560px, 100%)',
    background: '#111',
    color: '#fff',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 16px 12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.12)',
  },
  title: { margin: 0, fontSize: 18, fontWeight: 700 },
  iconBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.18)',
    color: '#fff',
    borderRadius: 10,
    padding: '6px 10px',
    cursor: 'pointer',
  },
  body: { padding: 16, maxHeight: '70vh', overflow: 'auto' },
  section: { marginBottom: 16 },
  sectionTitle: { margin: '0 0 10px 0', fontSize: 14, opacity: 0.85 },
  field: { display: 'grid', gap: 6, marginBottom: 12 },
  label: { fontSize: 12, opacity: 0.8 },
  input: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff',
    borderRadius: 10,
    padding: '10px 12px',
    outline: 'none',
  },
  checkboxRow: { display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    padding: 16,
    borderTop: '1px solid rgba(255,255,255,0.12)',
  },
  secondaryBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.18)',
    color: '#fff',
    borderRadius: 12,
    padding: '10px 14px',
    cursor: 'pointer',
  },
  primaryBtn: {
    background: '#fff',
    border: '1px solid rgba(255,255,255,0.18)',
    color: '#000',
    borderRadius: 12,
    padding: '10px 14px',
    fontWeight: 700,
  },
  muted: { opacity: 0.7, margin: 0 },
  error: {
    background: 'rgba(255,0,0,0.12)',
    border: '1px solid rgba(255,0,0,0.3)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
}
