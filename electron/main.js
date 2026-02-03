// electron/main.js (ESM)
import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let win = null
let tray = null

function createWindow() {
  win = new BrowserWindow({
    width: 900,
    height: 650,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'), // your preload is CJS
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.loadURL('http://localhost:5173')
}

function createTray() {
  // macOS can show title text even with an empty icon
  const img = nativeImage.createEmpty()
  tray = new Tray(img)

  tray.setTitle('25:00')              // ✅ shows in macOS menu bar
  tray.setToolTip('Pomodoro Timer')

  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'Show',
        click: () => {
          if (!win) return
          win.show()
          win.focus()
        },
      },
      {
        label: 'Hide',
        click: () => win?.hide(),
      },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ])
  )

  // Optional: click toggles window
  tray.on('click', () => {
    if (!win) return
    if (win.isVisible()) win.hide()
    else {
      win.show()
      win.focus()
    }
  })
}

app.whenReady().then(() => {
  createTray()
  createWindow()

  // Receive updates from renderer timer and update menu bar text
  ipcMain.on('timer:tick', (_event, { remainingSec, isRunning }) => {
    const s = Math.max(0, Math.floor(Number(remainingSec ?? 0)))
    const mm = String(Math.floor(s / 60)).padStart(2, '0')
    const ss = String(s % 60).padStart(2, '0')

    const status = isRunning ? '▶' : '⏸'
    tray?.setTitle(`${mm}:${ss} ${status}`)
    tray?.setToolTip(`Pomodoro • ${mm}:${ss}`)
    win?.setTitle(`${mm}:${ss} ${status} • Pomodoro`)
  })
})

// Keep app alive in menu bar when window closed (macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
