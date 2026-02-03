import { useState } from 'react'
import { SettingsModal } from './components/SettingsModal'
import { SimpleTimer } from './components/SimpleTimer'

export default function App() {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ padding: 24, display: 'grid', gap: 12, placeItems: 'center', minHeight: '100vh' }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => setOpen(true)}>Settings</button>
      </div>

      <SimpleTimer />

      <SettingsModal open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
