// electron/settings-store.js
import { app } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'

const DEFAULT_SETTINGS = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  soundEnabled: true,
}

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json')
}

async function ensureDirExists(filePath) {
  const dir = path.dirname(filePath)
  await fs.mkdir(dir, { recursive: true })
}

async function readJsonSafe(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function writeJsonAtomic(filePath, data) {
  const tmp = `${filePath}.tmp`
  const json = JSON.stringify(data, null, 2)

  await ensureDirExists(filePath)
  await fs.writeFile(tmp, json, 'utf-8')
  await fs.rename(tmp, filePath)
}

export async function loadSettings() {
  const filePath = getSettingsPath()
  const existing = await readJsonSafe(filePath)
  const merged = { ...DEFAULT_SETTINGS, ...(existing ?? {}) }

  if (!existing) {
    await writeJsonAtomic(filePath, merged)
  }

  return merged
}

export async function saveSettings(partial) {
  const filePath = getSettingsPath()
  const current = await loadSettings()
  const next = { ...current, ...(partial ?? {}) }

  await writeJsonAtomic(filePath, next)
  return next
}

export async function setSetting(key, value) {
  return await saveSettings({ [key]: value })
}
