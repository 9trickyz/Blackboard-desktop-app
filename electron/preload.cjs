const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  minimize: () => ipcRenderer.send('window-minimize'),
  minitab: () => ipcRenderer.send('window-minitab'),
  close: () => ipcRenderer.send('window-close'),
  confirmClose: () => ipcRenderer.send('window-close-confirmed'),
  onAppCloseRequested: (callback) => {
    ipcRenderer.on('app-close-requested', (_event) => callback());
  },
  setAlwaysOnTop: (flag) => ipcRenderer.send('window-always-on-top', flag),
  readClipboardImage: () => ipcRenderer.invoke('read-clipboard-image'),
  saveFile: (data) => ipcRenderer.invoke('save-file-dialog', data),
  openFile: () => ipcRenderer.invoke('open-file-dialog'),
  getInitialFile: () => ipcRenderer.invoke('get-initial-file'),
  onFileOpened: (callback) => {
    ipcRenderer.on('file-opened', (_event, data) => callback(data));
  },
  onMinitabChanged: (callback) => {
    ipcRenderer.on('minitab-state-changed', (_event, state) => callback(state));
  }
});
