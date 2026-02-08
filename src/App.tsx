// src/App.tsx (hash route: main vs tray)
import { SimpleTimer } from './components/SimpleTimer'

function TrayView() {
  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ margin: 0, marginBottom: 12 }}>Pomodoro</h3>
      <SimpleTimer />
    </div>
  )
}

function MainView() {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Pomodoro Activities</h1>
      <SimpleTimer />
    </div>
  )
}

export default function App() {
  const hash = window.location.hash // "#/tray"
  const isTray = hash.startsWith('#/tray')
  return isTray ? <TrayView /> : <MainView />
}
