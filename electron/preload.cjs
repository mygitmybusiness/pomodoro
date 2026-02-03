// electron/preload.cjs
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('settings', {
  getAll: () => ipcRenderer.invoke('settings:getAll'),
  setAll: (partial) => ipcRenderer.invoke('settings:setAll', partial),
  set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
})

// ✅ add timer bridge
contextBridge.exposeInMainWorld('timer', {
  tick: (remainingSec, isRunning) =>
    ipcRenderer.send('timer:tick', { remainingSec, isRunning }),
})
