export const SETTINGS_CHANGED_EVENT = 'settings:changed'

export function emitSettingsChanged(settings: unknown) {
  window.dispatchEvent(new CustomEvent(SETTINGS_CHANGED_EVENT, { detail: settings }))
}
