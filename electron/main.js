// electron/main.js
import { app, BrowserWindow, Tray, nativeImage, ipcMain } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadSettings, saveSettings, setSetting } from './settings-store.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let tray = null
let popoverWin = null

let lastTitle = '25:00'
let lastTooltip = 'Pomodoro • 25:00'

function isAlive(w) {
  return w && !w.isDestroyed()
}

function formatMMSS(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds ?? 0)))
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

function ensurePopover() {
  if (isAlive(popoverWin)) return

  popoverWin = new BrowserWindow({
    width: 420,
    height: 520,
    show: false,
    frame: false,
    resizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    movable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
  
      // ✅ IMPORTANT: keep timers running when popover is hidden
      backgroundThrottling: false,
    },
  })
  

  // Hide (do NOT destroy) when clicking outside
  popoverWin.on('blur', () => {
    if (popoverWin?.isVisible()) popoverWin.hide()
  })

  popoverWin.on('closed', () => {
    popoverWin = null
  })

  // Render your app inside the popover
  popoverWin.loadURL('http://localhost:5173/#/tray')
}

function positionPopover() {
  if (!tray) return
  ensurePopover()

  const trayBounds = tray.getBounds()
  const winBounds = popoverWin.getBounds()

  const x = Math.round(trayBounds.x + trayBounds.width / 2 - winBounds.width / 2)
  const y = Math.round(trayBounds.y + trayBounds.height + 6)

  popoverWin.setPosition(x, y, false)
}

function showPopover() {
  ensurePopover()
  positionPopover()
  popoverWin.show()
  popoverWin.focus()
}

function togglePopover() {
  ensurePopover()
  if (popoverWin.isVisible()) popoverWin.hide()
  else showPopover()
}

function createTray() {
  tray = new Tray(nativeImage.createEmpty())
  tray.setTitle(lastTitle)
  tray.setToolTip(lastTooltip)

  tray.on('click', togglePopover)
  tray.on('right-click', togglePopover)
}

app.whenReady().then(async () => {
  // Menu-bar-only experience on macOS
  if (process.platform === 'darwin') app.dock.hide()

  createTray()
  ensurePopover() // create hidden popover on startup (NOT shown)

  // Ensure settings file exists early
  try {
    await loadSettings()
  } catch (e) {
    console.error('[main] loadSettings failed on startup:', e)
  }

  // Settings IPC handlers (required for ipcRenderer.invoke)
  ipcMain.handle('settings:getAll', async () => loadSettings())
  ipcMain.handle('settings:setAll', async (_e, partial) => saveSettings(partial))
  ipcMain.handle('settings:set', async (_e, key, value) => setSetting(key, value))

  // Renderer can control popover
  ipcMain.on('tray:open', () => showPopover())
  ipcMain.on('tray:toggle', () => togglePopover())
  ipcMain.on('tray:close', () => popoverWin?.hide())

  // Timer updates from renderer -> always update tray, even if popover is hidden
  ipcMain.on('timer:tick', (_event, { remainingSec, isRunning }) => {
    const t = formatMMSS(remainingSec)
    const status = isRunning ? '▶' : '⏸'

    lastTitle = `${t} ${status}`
    lastTooltip = `Pomodoro • ${t}`

    tray?.setTitle(lastTitle)
    tray?.setToolTip(lastTooltip)
  })
})

// Keep running as menu bar app
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
